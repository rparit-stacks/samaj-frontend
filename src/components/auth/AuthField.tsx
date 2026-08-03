import * as React from "react";
import { cn } from "@/lib/utils";

export interface AuthFieldProps extends Omit<React.ComponentProps<"input">, "size"> {
  label: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
  error?: string;
}

const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  (
    {
      label,
      leadingIcon,
      trailingIcon,
      className,
      containerClassName,
      error,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        <label
          htmlFor={fieldId}
          className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-foreground/70"
        >
          {label}
        </label>
        <div className="relative">
          {leadingIcon ? (
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none [&_svg]:h-[18px] [&_svg]:w-[18px]"
              aria-hidden="true"
            >
              {leadingIcon}
            </span>
          ) : null}
          <input
            id={fieldId}
            ref={ref}
            disabled={disabled}
            className={cn(
              "flex h-14 w-full rounded-xl border border-transparent bg-muted/60 px-4 text-base text-foreground",
              "placeholder:text-muted-foreground/60",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:border-primary/30 focus-visible:bg-background focus-visible:ring-[3px] focus-visible:ring-primary/10",
              "disabled:cursor-not-allowed disabled:opacity-50",
              leadingIcon && "pl-11",
              trailingIcon && "pr-12",
              error && "border-destructive/40 ring-[3px] ring-destructive/10",
              className
            )}
            {...props}
          />
          {trailingIcon ? (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
              {trailingIcon}
            </span>
          ) : null}
        </div>
        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      </div>
    );
  }
);
AuthField.displayName = "AuthField";

export { AuthField };
