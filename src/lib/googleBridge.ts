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

interface GsiPromptNotification {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
  isDismissedMoment?: () => boolean;
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string; error?: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: "popup" | "redirect";
  }) => void;
  prompt: (momentListener?: (notification: GsiPromptNotification) => void) => void;
  renderButton: (
    parent: HTMLElement,
    options: { type?: string; theme?: string; size?: string; width?: number }
  ) => void;
}

interface SamajNativeBridge {
  startGoogleSignIn?: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
    SamajNative?: SamajNativeBridge;
    __samajGoogleCallback?: ((idToken: string | null, error: string | null) => void) | null;
  }
}

/** True when running inside the Samaj Android WebView wrapper. */
export function isAndroidWebView(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return ua.includes("SamajApp/");
}

/** True when Google Identity Services is available (web only). */
function isGsiLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.google?.accounts?.id !== "undefined";
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
  const native = window.SamajNative;
  if (!native?.startGoogleSignIn) {
    onError("Google Sign-In is not available on this device");
    return;
  }
  // Register one-shot callback that Android will invoke with the result
  window.__samajGoogleCallback = (idToken: string | null, error: string | null) => {
    window.__samajGoogleCallback = null;
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
  const google = window.google;
  if (!google?.accounts?.id) {
    onError("Google Sign-In is not available");
    return;
  }
  let settled = false;
  const fire = (idToken: string) => {
    if (settled) return;
    settled = true;
    onToken(idToken);
  };
  const fail = (msg: string) => {
    if (settled) return;
    settled = true;
    onError(msg);
  };

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response: { credential?: string; error?: string }) => {
      if (response.credential) {
        fire(response.credential);
      } else {
        fail("Google Sign-In failed");
      }
    },
    auto_select: false,
    cancel_on_tap_outside: false,
    use_fedcm_for_prompt: true,
    ux_mode: "popup",
  });

  google.accounts.id.prompt((notification: GsiPromptNotification) => {
    if (settled) return;
    // One Tap suppressed (cooldown, FedCM disabled, browser policy, etc.) →
    // fall back to a transient sign-in button that triggers the same id_token callback.
    if (
      notification.isNotDisplayed?.() ||
      notification.isSkippedMoment?.() ||
      notification.isDismissedMoment?.()
    ) {
      showGoogleSignInPopup(fire, fail);
    }
  });
}

/**
 * Fallback when One Tap is suppressed: render a real Google sign-in button into a
 * transient container and programmatically click it. The button uses the same
 * `google.accounts.id.initialize` callback above, so we still get a JWT id_token.
 */
function showGoogleSignInPopup(onToken: SignInCallback, onError: ErrorCallback): void {
  const google = window.google;
  if (!google?.accounts?.id?.renderButton) {
    onError("Google Sign-In popup is not available");
    return;
  }

  // Build a transient, off-screen host for the GSI button.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "-10000px";
  host.style.opacity = "0";
  host.style.pointerEvents = "none";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);

  let clicked = false;
  const cleanup = () => {
    try {
      document.body.removeChild(host);
    } catch {
      // ignore
    }
  };

  try {
    google.accounts.id.renderButton(host, {
      type: "standard",
      theme: "outline",
      size: "large",
      width: 240,
    });
  } catch {
    cleanup();
    onError("Google Sign-In is not available");
    return;
  }

  // GSI renders an iframe with a single inner button; the click opens the popup.
  // Poll briefly until it mounts, then click it.
  const start = Date.now();
  const tick = () => {
    if (clicked) return;
    const clickable = host.querySelector<HTMLElement>("div[role=button], div[tabindex], iframe");
    if (clickable) {
      clicked = true;
      // For the iframe variant, click() works on the wrapping div; for the div variant, click() opens popup.
      try {
        (clickable as HTMLElement).click();
      } catch {
        onError("Could not open Google Sign-In");
      }
      // We can remove the host after a short delay; the popup is decoupled.
      window.setTimeout(cleanup, 1500);
      return;
    }
    if (Date.now() - start > 4000) {
      cleanup();
      onError("Google Sign-In did not load. Please try again.");
      return;
    }
    window.setTimeout(tick, 80);
  };
  tick();
}
