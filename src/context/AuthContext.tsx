import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import {
  authApi,
  userApi,
  recordUserSessionExpiry,
  refreshSession,
  startSessionKeepAlive,
  type AuthResponse,
  type UserResponse,
} from "@/lib/api";

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

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  /** After OTP verify / social callback: persist tokens and sync React auth state (same as login). */
  completeSession: (auth: AuthResponse) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    let access = localStorage.getItem("accessToken");
    const refresh = localStorage.getItem("refreshToken");
    if (!access && !refresh) {
      setUser(null);
      return;
    }
    // If only refresh token is present (or access was cleared), mint access first.
    // Otherwise the boot effect skipped refreshUser entirely and every reload looked logged out.
    if (!access && refresh) {
      const ok = await refreshSession();
      if (!ok) {
        setUser(null);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("accessTokenExpiresAt");
        localStorage.removeItem("samajUserId");
        return;
      }
      access = localStorage.getItem("accessToken");
    }
    const loadMe = async () => {
      const u = await authApi.me();
      setUser(u);
      if (u?.id) {
        localStorage.setItem("samajUserId", u.id);
      }
      syncAuthUserToProfile(u);
    };
    try {
      await loadMe();
    } catch {
      const recovered = await refreshSession();
      if (recovered) {
        try {
          await loadMe();
          return;
        } catch {
          /* e.g. network — keep tokens, show logged out until retry */
          setUser(null);
          return;
        }
      }
      setUser(null);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("accessTokenExpiresAt");
      localStorage.removeItem("samajUserId");
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
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await authApi.login({ identifier, password });
    completeSession(res);
  }, [completeSession]);

  const logout = useCallback(async () => {
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
        login,
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
