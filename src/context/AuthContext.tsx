import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  authApi,
  userApi,
  deviceTokenApi,
  recordUserSessionExpiry,
  refreshSession,
  refreshSessionDetailed,
  isNetworkError,
  startSessionKeepAlive,
  type AuthResponse,
  type LoginChallenge,
  type UserResponse,
} from "@/lib/api";

/** Reads the FCM token injected by the Android WebView, if available. */
function getNativeFcmToken(): string | null {
  if (typeof window === "undefined") return null;
  const w = window as Record<string, unknown>;
  if (typeof w.__fcmToken === "string" && w.__fcmToken) return w.__fcmToken as string;
  const native = w.SamajNative as Record<string, unknown> | undefined;
  if (native && typeof native.getFcmToken === "function") {
    const t = (native.getFcmToken as () => string)();
    return t || null;
  }
  return null;
}

function registerFcmToken() {
  const token = getNativeFcmToken();
  if (token) deviceTokenApi.register(token).catch(() => {});
}

function unregisterFcmToken() {
  const token = getNativeFcmToken();
  if (token) deviceTokenApi.unregister(token).catch(() => {});
}

/**
 * Sync Auth user to UserService so user_profiles and user_settings have data.
 * Auth is source of truth for email/phone/name; we push to UserService on every load/login.
 */
function syncAuthUserToProfile(u: UserResponse) {
  const fullName =
    (u.metadata?.name as string) ||
    (u.email ? u.email.split("@")[0] : null) ||
    undefined;
  userApi
    .updateProfile({
      email: u.email ?? undefined,
      phone: u.phone ?? undefined,
      fullName: fullName || undefined,
    })
    .catch(() => {});
  userApi.getSettings().catch(() => {}); // ensure user_settings row exists (getOrCreate)
}

/**
 * Result of attempting password login:
 *   - "session"   → password verified AND no 2FA required (parent admin bypass); session is live.
 *   - "challenge" → password verified; server sent an OTP, client must verify it next.
 */
export type LoginResult =
  | { kind: "session" }
  | { kind: "challenge"; identifier: string; type: string; message?: string };

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /**
   * True when the session could not be verified because the device is offline.
   * Tokens are deliberately kept in this state — the UI should prompt the user
   * to check their connection and retry, never send them back to login.
   */
  isOffline: boolean;
  /** Step 1: password login. Returns "challenge" when the server requires an OTP. */
  login: (identifier: string, password: string) => Promise<LoginResult>;
  /** Step 2: OTP login, called after a challenge to complete the session. */
  loginWithOtp: (identifier: string, otp: string) => Promise<void>;
  /** After OTP verify / social callback: persist tokens and sync React auth state (same as login). */
  completeSession: (auth: AuthResponse) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setOffline] = useState(false);

  const refreshUser = useCallback(async () => {
    let access = localStorage.getItem("accessToken");
    const refresh = localStorage.getItem("refreshToken");
    if (!access && !refresh) {
      setUser(null);
      return;
    }
    // If only refresh token is present (or access was cleared), mint access first.
    // Otherwise the boot effect skipped refreshUser entirely and every reload looked logged out.
    /** Drop the session only when the server actually rejected it. */
    const clearSession = () => {
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("accessTokenExpiresAt");
      localStorage.removeItem("samajUserId");
    };

    if (!access && refresh) {
      const outcome = await refreshSessionDetailed();
      if (outcome === "offline") {
        // No connectivity — keep the tokens so the session survives until the
        // network is back. Signing the user out here would be wrong.
        setOffline(true);
        return;
      }
      if (outcome === "rejected") {
        clearSession();
        return;
      }
      access = localStorage.getItem("accessToken");
    }
    const loadMe = async () => {
      const u = await authApi.me();
      setUser(u);
      setOffline(false);
      if (u?.id) {
        localStorage.setItem("samajUserId", u.id);
      }
      syncAuthUserToProfile(u);
    };
    try {
      await loadMe();
    } catch (err) {
      if (isNetworkError(err)) {
        setOffline(true);
        return;
      }
      const outcome = await refreshSessionDetailed();
      if (outcome === "ok") {
        try {
          await loadMe();
          return;
        } catch (retryErr) {
          if (isNetworkError(retryErr)) setOffline(true);
          return;
        }
      }
      if (outcome === "offline") {
        setOffline(true);
        return;
      }
      clearSession();
    }
  }, []);

  useEffect(() => {
    const access = localStorage.getItem("accessToken");
    const refresh = localStorage.getItem("refreshToken");
    if (!access && !refresh) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  useEffect(() => {
    const stop = startSessionKeepAlive();
    return stop;
  }, []);

  const completeSession = useCallback((res: AuthResponse) => {
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    recordUserSessionExpiry(res.expiresIn);
    setUser(res.user);
    if (res.user?.id) {
      localStorage.setItem("samajUserId", res.user.id);
    }
    syncAuthUserToProfile(res.user);
    // Register this device's FCM token with the backend so it can receive targeted push notifications
    registerFcmToken();
  }, []);

  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      const res = await authApi.login({ identifier, password });
      if ("otpRequired" in res && res.otpRequired === true) {
        const challenge = res as LoginChallenge;
        return {
          kind: "challenge",
          identifier: challenge.identifier,
          type: challenge.type,
          message: challenge.message,
        };
      }
      // Parent-admin bypass: server returned a full AuthResponse alongside otpRequired:false
      const auth = res as AuthResponse;
      completeSession(auth);
      return { kind: "session" };
    },
    [completeSession]
  );

  const loginWithOtp = useCallback(
    async (identifier: string, otp: string) => {
      const auth = await authApi.loginWithOtp({ identifier, otp });
      completeSession(auth);
    },
    [completeSession]
  );

  const logout = useCallback(async () => {
    // Unregister FCM token before clearing auth headers so the request can authenticate
    unregisterFcmToken();
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessTokenExpiresAt");
    localStorage.removeItem("samajUserId");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isOffline,
        login,
        loginWithOtp,
        completeSession,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
