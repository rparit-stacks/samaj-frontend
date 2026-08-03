import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** Outer box size in Tailwind units / pixels via className override */
  className?: string;
  /** Image size class — defaults fill the container */
  imgClassName?: string;
  alt?: string;
  /** Rounded container (auth marks use rounded-2xl) */
  rounded?: "none" | "xl" | "2xl" | "full";
};

const ROUND = {
  none: "rounded-none",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
} as const;

/** Official Samaj mark from /public/logo.png */
export function BrandLogo({
  className,
  imgClassName,
  alt = "Samaj",
  rounded = "2xl",
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 overflow-hidden bg-black ring-1 ring-black/10",
        ROUND[rounded],
        className,
      )}
    >
      <img
        src="/logo.png"
        alt={alt}
        width={512}
        height={512}
        decoding="async"
        className={cn("h-full w-full object-cover", imgClassName)}
        draggable={false}
      />
    </span>
  );
}
