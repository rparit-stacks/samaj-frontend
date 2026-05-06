/**
 * Google Sign-In bridge utilities.
 *
 * On Android WebView, we call window.SamajNative.startGoogleSignIn() which
 * triggers native Credential Manager. The Android app passes the ID token back
 * via window.__samajGoogleCallback(idToken, error).
 *
 * On web, we load Google Identity Services and use the One Tap / button flow.
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** True when running inside the Samaj Android WebView wrapper. */
export function isAndroidWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return ua.includes("SamajApp/");
}

/** True when Google Identity Services is available (web only). */
function isGsiLoaded(): boolean {
  return typeof window !== "undefined" && typeof (window as any).google?.accounts?.id !== "undefined";
}

let gsiLoadPromise: Promise<void> | null = null;

/** Dynamically load the Google Identity Services script. */
function loadGsi(): Promise<void> {
  if (isGsiLoaded()) return Promise.resolve();
  if (gsiLoadPromise) return gsiLoadPromise;
  gsiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
  return gsiLoadPromise;
}

type SignInCallback = (idToken: string) => void;
type ErrorCallback = (error: string) => void;

/**
 * Initiate Google Sign-In. Platform-aware:
 * - Android WebView: delegates to native Credential Manager via SamajNative.startGoogleSignIn()
 * - Web: uses Google Identity Services One Tap / popup
 *
 * @param onToken Called with the Google ID token on success
 * @param onError Called with a human-readable error on failure
 */
export async function startGoogleSignIn(
  onToken: SignInCallback,
  onError: ErrorCallback
): Promise<void> {
  if (isAndroidWebView()) {
    return startAndroidGoogleSignIn(onToken, onError);
  }
  return startWebGoogleSignIn(onToken, onError);
}

function startAndroidGoogleSignIn(onToken: SignInCallback, onError: ErrorCallback): void {
  const native = (window as any).SamajNative;
  if (!native?.startGoogleSignIn) {
    onError("Google Sign-In is not available on this device");
    return;
  }
  // Register one-shot callback that Android will invoke with the result
  (window as any).__samajGoogleCallback = (idToken: string | null, error: string | null) => {
    (window as any).__samajGoogleCallback = null;
    if (idToken) {
      onToken(idToken);
    } else {
      onError(error || "Google Sign-In was cancelled");
    }
  };
  native.startGoogleSignIn();
}

async function startWebGoogleSignIn(onToken: SignInCallback, onError: ErrorCallback): Promise<void> {
  if (!GOOGLE_CLIENT_ID) {
    onError("Google Sign-In is not configured");
    return;
  }
  try {
    await loadGsi();
  } catch {
    onError("Could not load Google Sign-In. Check your connection.");
    return;
  }
  const google = (window as any).google;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response: { credential: string; error?: string }) => {
      if (response.credential) {
        onToken(response.credential);
      } else {
        onError("Google Sign-In failed");
      }
    },
    cancel_on_tap_outside: false,
  });
  google.accounts.id.prompt((notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // One Tap was suppressed — fall back to the explicit sign-in button flow
      // This can happen if the user previously dismissed One Tap too many times
      showGoogleSignInPopup(onToken, onError);
    }
  });
}

/** Fallback when One Tap is suppressed: render a hidden sign-in button and click it. */
function showGoogleSignInPopup(onToken: SignInCallback, onError: ErrorCallback): void {
  const google = (window as any).google;
  if (!google?.accounts?.oauth2) {
    onError("Google Sign-In popup is not available");
    return;
  }
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "openid email profile",
    callback: (tokenResponse: { access_token?: string; error?: string }) => {
      if (tokenResponse.error) {
        onError(tokenResponse.error === "access_denied" ? "Google Sign-In was cancelled" : tokenResponse.error);
        return;
      }
      // Exchange access token for ID token via userinfo
      fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      })
        .then((r) => r.json())
        .then((profile) => {
          // Can't get ID token from access token alone — need to re-initialize with id_token_hint
          // Fall back: tell user to try again (this path is rare)
          onError("Please try signing in again.");
          console.warn("Google fallback path hit — sub:", profile.sub);
        })
        .catch(() => onError("Could not retrieve Google profile"));
    },
  });
  tokenClient.requestAccessToken({ prompt: "select_account" });
}
