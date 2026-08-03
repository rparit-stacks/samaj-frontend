import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface AuthShellProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
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

export function AuthShell({ children, footer, className }: AuthShellProps) {
  return (
    <div
      className={cn(
        "min-h-dvh flex flex-col bg-background relative overflow-hidden",
        className
      )}
    >
      {/* Real OS safe-area only (Capacitor). No fake status bar. */}
      <div className="native-status-inset md:hidden" aria-hidden />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[140%] rounded-full bg-primary/[0.05] blur-3xl" />
      </div>

      <div className="relative flex flex-1 flex-col">
        <main className="flex-1 w-full">
          <div className="mx-auto w-full max-w-md px-safe-6 pb-8">{children}</div>
        </main>
        {footer === undefined ? <DefaultFooter /> : footer}
      </div>
    </div>
  );
}
