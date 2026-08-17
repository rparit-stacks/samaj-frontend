import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAY_STORE_URL, androidIntentUrl } from "@/lib/shareLinks";

const DISMISS_KEY = "samaj.openInApp.dismissed";

/**
 * Shown only on the mobile *web* build.
 *
 * When someone opens a shared link on a phone, Android App Links already hand
 * the URL to the app if it is installed — this banner never renders in that
 * case because the app took over. It exists for the other half: a phone
 * *without* the app, where the right destination is the Play Store rather than
 * a browser page. Desktop keeps the plain website with no banner at all.
 */
export function OpenInAppBanner() {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Inside the app itself there is nothing to promote.
    if (Capacitor.isNativePlatform()) return;
    if (typeof navigator === "undefined") return;
    if (!/android/i.test(navigator.userAgent)) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // sessionStorage unavailable (private mode) — still show the banner.
    }
    setDismissed(false);
  }, []);

  if (dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  const openApp = () => {
    const path = `${location.pathname}${location.search}`;
    // The intent URL opens the app at this exact path when installed and
    // falls back to the Play Store listing when it is not.
    window.location.href = androidIntentUrl(path);
  };

  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 border-b border-border/70 bg-card px-3 py-2.5 shadow-sm">
      <img
        src="/favicon.ico"
        alt=""
        className="h-9 w-9 shrink-0 rounded-lg"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Samaj App</p>
        <p className="truncate text-xs text-muted-foreground">Open this in the app</p>
      </div>
      <Button size="sm" className="shrink-0 rounded-full px-4" onClick={openApp}>
        Open
      </Button>
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="sr-only"
      >
        Get the app on Google Play
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={close}
        className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
