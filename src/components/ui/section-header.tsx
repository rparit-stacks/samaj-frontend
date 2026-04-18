import { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    to: string;
  };
  className?: string;
  children?: ReactNode;
}

export function SectionHeader({ 
  title, 
  subtitle, 
  action, 
  className,
  children 
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link 
          to={action.to}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
      {children}
    </div>
  );
}
