import { useState, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { Image as ImageIcon } from "lucide-react";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  showSkeleton?: boolean;
  className?: string;
  containerClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  fallback,
  showSkeleton = true,
  className,
  containerClassName,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(showSkeleton);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    if (fallback) {
      setImageSrc(fallback);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  // Reset states when src changes
  if (imageSrc !== src && !hasError) {
    setIsLoading(showSkeleton);
    setImageSrc(src);
    setHasError(false);
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {isLoading && (
        <Skeleton className={cn("absolute inset-0", className)} />
      )}
      
      {hasError ? (
        <div
          className={cn(
            "flex items-center justify-center bg-muted text-muted-foreground",
            className
          )}
          {...props}
        >
          <ImageIcon className="h-8 w-8 opacity-50" />
        </div>
      ) : (
        <img
          src={imageSrc}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100",
            className
          )}
          {...props}
        />
      )}
    </div>
  );
}

// Avatar Image Component
interface OptimizedAvatarProps {
  src?: string;
  alt: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-20 w-20",
};

export function OptimizedAvatar({
  src,
  alt,
  fallback,
  className,
  size = "md",
}: OptimizedAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);

  const handleError = () => {
    if (fallback && imageSrc !== fallback) {
      setImageSrc(fallback);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  if (imageSrc !== src && !hasError) {
    setImageSrc(src);
    setHasError(false);
  }

  const initials = alt
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (hasError || !imageSrc) {
    return (
      <div
        className={cn(
          "rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold",
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={imageSrc}
      alt={alt}
      fallback={fallback}
      showSkeleton={false}
      className={cn("rounded-full object-cover", sizeClasses[size], className)}
      onError={handleError}
    />
  );
}
