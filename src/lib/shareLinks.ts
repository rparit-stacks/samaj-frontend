import { Capacitor } from "@capacitor/core";

/**
 * Canonical public origin for anything a user shares outside the app.
 *
 * Shared links must never contain `localhost`, a LAN IP, or the Capacitor
 * `https://localhost` origin the Android WebView serves the bundle from — the
 * recipient cannot open any of those. This host is also registered for Android
 * App Links (see DeepLinkHandler + AndroidManifest), so links open in the app
 * when it is installed and fall back to the web build otherwise.
 */
export const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL || "https://web.suryavanshisamaj.online"
).replace(/\/+$/, "");

/** Android package id — must match `appId` in capacitor.config.ts. */
export const ANDROID_PACKAGE = "com.rps.samajapp";

/** Play Store listing, used when the app is not installed. */
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/**
 * Builds an Android intent: URL that opens the app at `path` when installed and
 * falls back to the Play Store listing when it is not. Chrome honours the
 * S.browser_fallback_url extra for exactly this purpose.
 */
export function androidIntentUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const host = PUBLIC_SITE_URL.replace(/^https?:\/\//, "");
  const fallback = encodeURIComponent(PLAY_STORE_URL);
  return (
    `intent://${host}${normalized}#Intent;scheme=https;` +
    `package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`
  );
}

/** True when window.location.origin is unusable as a shareable base. */
function originIsShareable(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return false;
  const { hostname, protocol } = window.location;
  if (protocol === "capacitor:" || protocol === "file:") return false;
  return !(
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "10.0.2.2" ||
    hostname.endsWith(".local") ||
    /^(10|127)\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

/**
 * Builds an absolute, publicly-openable URL for a in-app path.
 * Falls back to the real origin only when it is genuinely public (prod web build).
 */
export function buildShareUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = originIsShareable() ? window.location.origin : PUBLIC_SITE_URL;
  return `${base}${normalized}`;
}

/**
 * Shares a URL via the native/Web Share sheet, falling back to the clipboard.
 * Returns how it was handled so callers can show the right toast.
 */
export async function shareUrl(opts: {
  url: string;
  title?: string;
  text?: string;
}): Promise<"shared" | "copied" | "failed"> {
  const { url, title, text } = opts;
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return "shared";
    } catch (err) {
      // User dismissing the sheet is not an error worth falling through for.
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
