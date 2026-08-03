import { useMemo, useState, useEffect, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Battery, Signal, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface AuthShellProps {
  children: ReactNode;
  footer?: ReactNode;
  showStatusBar?: boolean;
  className?: string;
}

function FakeAndroidStatusBar() {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false });
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const d = new Date();
      setTime(d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false }));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="auth-status-bar flex items-center justify-between px-safe-5 h-8 text-[11px] font-semibold text-foreground/80 select-none"
      aria-hidden="true"
    >
      <span className="tabular-nums tracking-wide">{time}</span>
      <div className="flex items-center gap-2 shrink-0">
        <Signal className="h-3 w-3" strokeWidth={2.5} />
        <Wifi className="h-3 w-3" strokeWidth={2.5} />
        <Battery className="h-3.5 w-3.5" strokeWidth={2.2} />
      </div>
    </div>
  );
}

function DefaultFooter() {
  return (
    <footer className="pb-safe-bottom">
      <div className="mx-auto w-full max-w-md px-6 py-6 flex flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-foreground/70">
          <Link to="/privacy" className="hover:text-primary transition-colors">
            Privacy
          </Link>
          <span className="text-border" aria-hidden="true">
            ·
          </span>
          <Link to="/terms" className="hover:text-primary transition-colors">
            Terms
          </Link>
          <span className="text-border" aria-hidden="true">
            ·
          </span>
          <Link to="/delete-account" className="hover:text-primary transition-colors">
            Delete account
          </Link>
          <span className="text-border" aria-hidden="true">
            ·
          </span>
          <Link to="/help" className="hover:text-primary transition-colors">
            Help
          </Link>
        </div>
        <p className="text-[10px] text-muted-foreground/50">
          © {new Date().getFullYear()} Suryavanshi Samaj
        </p>
      </div>
    </footer>
  );
}

export function AuthShell({
  children,
  footer,
  showStatusBar,
  className,
}: AuthShellProps) {
  const isNative = useMemo(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }, []);

  const shouldShowBar = showStatusBar ?? !isNative;

  return (
    <div
      className={cn(
        "min-h-dvh flex flex-col bg-background relative overflow-hidden",
        className
      )}
    >
      <div className="native-status-inset md:hidden" aria-hidden />

      {/* Single soft accent — restrained, not decorative clutter */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[140%] rounded-full bg-primary/[0.05] blur-3xl" />
      </div>

      {shouldShowBar && <FakeAndroidStatusBar />}

      <div className="relative flex flex-1 flex-col">
        <main className="flex-1 w-full">
          <div className="mx-auto w-full max-w-md px-safe-6 pb-8">{children}</div>
        </main>
        {footer === undefined ? <DefaultFooter /> : footer}
      </div>
    </div>
  );
}
