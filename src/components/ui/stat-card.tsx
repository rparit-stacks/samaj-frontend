import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: "default" | "primary" | "secondary" | "accent";
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = "default",
  className 
}: StatCardProps) {
  const variants = {
    default: "bg-card",
    primary: "bg-gradient-primary text-primary-foreground",
    secondary: "bg-gradient-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  };

  const iconVariants = {
    default: "bg-primary/10 text-primary",
    primary: "bg-primary-foreground/20 text-primary-foreground",
    secondary: "bg-secondary-foreground/20 text-secondary-foreground",
    accent: "bg-accent-foreground/20 text-accent-foreground",
  };

  return (
    <div className={cn(
      "rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-card transition-all duration-300 hover:shadow-card-hover min-w-0",
      variants[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <p className={cn(
            "text-xs sm:text-sm font-medium truncate",
            variant === "default" ? "text-muted-foreground" : "opacity-80"
          )}>
            {title}
          </p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold truncate">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-xs",
              variant === "default" ? "text-muted-foreground" : "opacity-70"
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-1">
              <span className={cn(
                "text-xs font-medium",
                trend.value >= 0 ? "text-success" : "text-destructive"
              )}>
                {trend.value >= 0 ? "+" : ""}{trend.value}%
              </span>
              <span className={cn(
                "text-xs",
                variant === "default" ? "text-muted-foreground" : "opacity-70"
              )}>
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0",
          iconVariants[variant]
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}
