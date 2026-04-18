import {
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type TouchEvent,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  /** Only enable on narrow screens (mobile) */
  mobileOnly?: boolean;
}

/**
 * Wrap scrollable page content. When scrolled to top, pull down to refresh.
 * Shows a loader with soft gradient backdrop while refreshing.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  mobileOnly = true,
}: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);
  const pullAmt = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const runRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (mobileOnly && typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
        return;
      }
      const el = containerRef.current;
      if (!el || el.scrollTop > 2) {
        active.current = false;
        return;
      }
      active.current = true;
      startY.current = e.touches[0].clientY;
      pullAmt.current = 0;
    },
    [mobileOnly]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent<HTMLDivElement>) => {
      if (!active.current || !containerRef.current || containerRef.current.scrollTop > 2) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        const next = Math.min(dy * 0.45, 96);
        pullAmt.current = next;
        setPull(next);
        if (dy > 12) e.preventDefault();
      }
    },
    []
  );

  const onTouchEnd = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    const threshold = 64;
    const should = pullAmt.current >= threshold;
    pullAmt.current = 0;
    setPull(0);
    if (should && !refreshing) void runRefresh();
  }, [refreshing, runRefresh]);

  const showIndicator = pull > 8 || refreshing;
  const progress = refreshing ? 1 : Math.min(pull / 72, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {/* Pull hint + refresh overlay */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 right-0 top-0 z-30 flex flex-col items-center justify-end overflow-hidden transition-[height,opacity] duration-150",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{ height: refreshing ? 72 : Math.max(pull, 0) }}
        aria-hidden
      >
        <div
          className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-xl"
          style={{ opacity: 0.35 + progress * 0.45 }}
        />
        <div className="relative mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 shadow-md ring-1 ring-border/60 backdrop-blur-md">
          <Loader2
            className={cn(
              "h-5 w-5 text-primary transition-transform",
              refreshing && "animate-spin",
              !refreshing && "opacity-70"
            )}
            style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>

      {refreshing && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-primary/15 via-background/40 to-transparent md:hidden"
          aria-hidden
        />
      )}

      <div className={cn(refreshing && "motion-safe:animate-pulse")}>{children}</div>
    </div>
  );
}
