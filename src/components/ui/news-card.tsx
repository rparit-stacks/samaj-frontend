import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { OptimizedImage } from "./optimized-image";

interface NewsCardProps {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  image?: string;
  isPinned?: boolean;
  isNew?: boolean;
  variant?: "default" | "compact" | "featured";
}

export function NewsCard({
  id,
  title,
  summary,
  category,
  date,
  image,
  isPinned,
  isNew,
  variant = "default",
}: NewsCardProps) {
  const categoryColors: Record<string, string> = {
    announcement: "bg-primary/10 text-primary border-primary/20",
    achievement: "bg-success/10 text-success border-success/20",
    event: "bg-secondary/20 text-secondary-foreground border-secondary/30",
    obituary: "bg-muted text-muted-foreground border-muted-foreground/20",
    policy: "bg-accent/10 text-accent border-accent/20",
  };

  if (variant === "compact") {
    return (
      <Link 
        to={`/news/${id}`}
        className="flex items-start gap-3 p-3 rounded-xl bg-card hover:bg-muted/50 transition-colors"
      >
        {image && (
          <OptimizedImage 
            src={image} 
            alt={title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
            showSkeleton={true}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn("text-xs", categoryColors[category.toLowerCase()] || "")}>
              {category}
            </Badge>
            {isNew && (
              <Badge className="bg-secondary text-secondary-foreground text-xs">NEW</Badge>
            )}
          </div>
          <h3 className="font-medium text-sm line-clamp-2">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{date}</p>
        </div>
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link 
        to={`/news/${id}`}
        className="group block rounded-2xl overflow-hidden bg-card shadow-card hover:shadow-card-hover transition-all duration-300"
      >
        {image && (
          <div className="aspect-video overflow-hidden">
            <OptimizedImage 
              src={image} 
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              showSkeleton={true}
            />
          </div>
        )}
        <div className="p-4 md:p-5">
          <div className="flex items-center gap-2 mb-2">
            {isPinned && (
              <Badge className="bg-primary text-primary-foreground text-xs">📌 Pinned</Badge>
            )}
            <Badge variant="outline" className={cn("text-xs", categoryColors[category.toLowerCase()] || "")}>
              {category}
            </Badge>
            {isNew && (
              <Badge className="bg-secondary text-secondary-foreground text-xs">NEW</Badge>
            )}
          </div>
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{summary}</p>
          <p className="text-xs text-muted-foreground mt-3">{date}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link 
      to={`/news/${id}`}
      className="group flex gap-4 p-4 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      {image && (
        <OptimizedImage 
          src={image} 
          alt={title}
          className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
          showSkeleton={true}
        />
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {isPinned && (
            <Badge className="bg-primary text-primary-foreground text-xs">📌 Pinned</Badge>
          )}
          <Badge variant="outline" className={cn("text-xs", categoryColors[category.toLowerCase()] || "")}>
            {category}
          </Badge>
          {isNew && (
            <Badge className="bg-secondary text-secondary-foreground text-xs">NEW</Badge>
          )}
        </div>
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2 flex-1">{summary}</p>
        <p className="text-xs text-muted-foreground mt-2">{date}</p>
      </div>
    </Link>
  );
}
