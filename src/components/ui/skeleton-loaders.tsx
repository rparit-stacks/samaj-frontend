import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

// News Card Skeleton
export function NewsCardSkeleton({ variant = "default" }: { variant?: "default" | "compact" | "featured" }) {
  if (variant === "compact") {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl bg-card">
        <Skeleton className="w-16 h-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  if (variant === "featured") {
    return (
      <div className="rounded-2xl overflow-hidden bg-card shadow-card">
        <Skeleton className="aspect-video w-full" />
        <div className="p-4 md:p-5 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-card shadow-card">
      <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

// Event Card Skeleton
export function EventCardSkeleton({ variant = "default" }: { variant?: "default" | "compact" | "calendar" }) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    );
  }

  if (variant === "calendar") {
    return (
      <div className="p-2 rounded-lg bg-muted/50">
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-card shadow-card">
      <Skeleton className="aspect-[2/1] w-full" />
      <div className="p-4 md:p-5 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

// Member Card Skeleton
export function MemberCardSkeleton({ variant = "default" }: { variant?: "default" | "compact" | "grid" }) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="p-4 rounded-2xl bg-card shadow-card text-center">
        <Skeleton className="h-20 w-20 rounded-full mx-auto mb-3" />
        <Skeleton className="h-5 w-24 mx-auto mb-2" />
        <Skeleton className="h-4 w-20 mx-auto mb-1" />
        <Skeleton className="h-3 w-16 mx-auto" />
        <Skeleton className="h-5 w-12 rounded-full mx-auto mt-2" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4 rounded-2xl bg-card shadow-card">
      <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="flex justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </div>
  );
}

// Stat Card Skeleton
export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-2xl bg-card shadow-card">
      <Skeleton className="h-10 w-10 rounded-lg mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// Post Card Skeleton (for Feeds)
export function PostCardSkeleton() {
  return (
    <div className={cn(
      // Mobile: IG-like edge-to-edge skeleton
      "bg-background rounded-none shadow-none border-b border-border/70",
      // Desktop: card feel
      "md:bg-card md:rounded-2xl md:shadow-card md:p-4 md:border md:border-border/60",
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 md:p-0 md:pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-8 w-8 rounded-2xl" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 md:px-0 md:pb-4 space-y-2">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-5/6 rounded-full" />
      </div>

      {/* Media (full-bleed on mobile) */}
      <div className="px-0 md:px-0">
        <Skeleton className="h-[320px] w-full rounded-none md:rounded-xl" />
      </div>

      {/* Actions */}
      <div className="px-3 py-3 md:px-0 md:pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-2xl" />
          <Skeleton className="h-9 w-9 rounded-2xl" />
          <Skeleton className="h-9 w-9 rounded-2xl" />
        </div>
        <Skeleton className="h-9 w-9 rounded-2xl" />
      </div>
    </div>
  );
}

// List Skeleton (for tables/lists)
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// Grid Skeleton
export function GridSkeleton({ 
  items = 6, 
  columns = 3,
  renderItem 
}: { 
  items?: number; 
  columns?: 2 | 3 | 4;
  renderItem?: () => React.ReactNode;
}) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i}>
          {renderItem ? renderItem() : <Skeleton className="aspect-square rounded-2xl" />}
        </div>
      ))}
    </div>
  );
}
