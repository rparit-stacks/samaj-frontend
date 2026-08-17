import { useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-screen "no internet" state.
 *
 * Shown when the session could not be verified because the device is offline.
 * The user stays signed in throughout — this is a retry prompt, not a logout.
 */
/**
 * Thin banner for losing connectivity while already using the app — enough to
 * explain why things stopped updating, without hiding the content on screen.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-1.5 text-destructive-foreground">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <p className="text-xs font-medium">No internet connection</p>
    </div>
  );
}

export function OfflineScreen({ onRetry }: { onRetry: () => void | Promise<void> }) {
  const [retrying, setRetrying] = useState(false);

  // Retry automatically the moment the browser reports connectivity is back.
  useEffect(() => {
    const handleOnline = () => void onRetry();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onRetry]);

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-background px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-9 w-9 text-muted-foreground" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-xl font-bold">No internet connection</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Please check your mobile data or Wi-Fi and try again. You are still
          signed in — nothing has been lost.
        </p>
      </div>

      <Button onClick={() => void retry()} disabled={retrying} className="mt-1 gap-2 rounded-full px-6">
        <RefreshCw className={retrying ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {retrying ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}
