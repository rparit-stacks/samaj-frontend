import { cn } from "@/lib/utils";

interface StepProgressProps {
  steps: number;
  current: number;
  labels?: string[];
  className?: string;
}

export function StepProgress({ steps, current, labels, className }: StepProgressProps) {
  return (
    <div className={cn("w-full", className)} role="progressbar" aria-valuenow={current} aria-valuemin={1} aria-valuemax={steps}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: steps }, (_, i) => {
          const step = i + 1;
          const active = step === current;
          const done = step < current;
          return (
            <div key={step} className="flex-1 h-1 rounded-full overflow-hidden bg-muted-foreground/15">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300 ease-out",
                  (done || active) ? "w-full bg-primary" : "w-0"
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/80">
          {labels?.[current - 1] ?? `Step ${current}`}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {Math.min(current, steps)} / {steps}
        </span>
      </div>
    </div>
  );
}
