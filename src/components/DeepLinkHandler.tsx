import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const APP_LINK_HOSTS = new Set(["web.suryavanshisamaj.online", "www.suryavanshisamaj.online"]);

/**
 * Maps an incoming deep-link URL to an in-app path.
 * Examples:
 *   https://web.suryavanshisamaj.online/signup  → /signup
 *   https://web.suryavanshisamaj.online/login   → /login
 *   samaj://app/signup                         → /signup
 */
export function pathFromDeepLink(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);

    if (url.protocol === "samaj:") {
      // samaj://app/signup  or  samaj:///signup
      const hostPart = url.host && url.host !== "app" ? `/${url.host}` : "";
      const path = `${hostPart}${url.pathname || ""}`.replace(/\/{2,}/g, "/") || "/";
      return `${path.startsWith("/") ? path : `/${path}`}${url.search}${url.hash}`;
    }

    if (url.protocol === "https:" || url.protocol === "http:") {
      if (!APP_LINK_HOSTS.has(url.hostname)) return null;
      const path = url.pathname || "/";
      return `${path}${url.search}${url.hash}`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Listens for Android App Links / custom-scheme opens and routes inside the SPA.
 * Must render inside <BrowserRouter>.
 */
export function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeUrlOpen: (() => void) | undefined;
    let cancelled = false;

    const go = (rawUrl: string) => {
      const path = pathFromDeepLink(rawUrl);
      if (!path) return;
      navigate(path, { replace: true });
    };

    void (async () => {
      const { App } = await import("@capacitor/app");

      try {
        const launch = await App.getLaunchUrl();
        if (!cancelled && launch?.url) go(launch.url);
      } catch {
        // no launch URL
      }

      const handle = await App.addListener("appUrlOpen", ({ url }) => {
        if (url) go(url);
      });
      removeUrlOpen = () => {
        void handle.remove();
      };
    })();

    return () => {
      cancelled = true;
      removeUrlOpen?.();
    };
  }, [navigate]);

  return null;
}
