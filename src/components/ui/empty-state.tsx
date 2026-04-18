import { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { 
  Search, Users, Calendar, FileText, Image, 
  MessageSquare, Heart, AlertCircle, Inbox,
  FolderOpen, Newspaper, Bell
} from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const defaultIcons: Record<string, ReactNode> = {
  search: <Search className="h-12 w-12 text-muted-foreground" />,
  users: <Users className="h-12 w-12 text-muted-foreground" />,
  calendar: <Calendar className="h-12 w-12 text-muted-foreground" />,
  file: <FileText className="h-12 w-12 text-muted-foreground" />,
  image: <Image className="h-12 w-12 text-muted-foreground" />,
  message: <MessageSquare className="h-12 w-12 text-muted-foreground" />,
  heart: <Heart className="h-12 w-12 text-muted-foreground" />,
  alert: <AlertCircle className="h-12 w-12 text-muted-foreground" />,
  inbox: <Inbox className="h-12 w-12 text-muted-foreground" />,
  folder: <FolderOpen className="h-12 w-12 text-muted-foreground" />,
  news: <Newspaper className="h-12 w-12 text-muted-foreground" />,
  bell: <Bell className="h-12 w-12 text-muted-foreground" />,
};

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  const iconElement = typeof icon === "string" ? defaultIcons[icon] : icon;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="mb-4 p-4 rounded-full bg-muted/50">
        {iconElement || defaultIcons.inbox}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Predefined empty states for common scenarios
export function EmptySearch({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon="search"
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={onClear ? { label: "Clear filters", onClick: onClear } : undefined}
    />
  );
}

export function EmptyDirectory({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon="users"
      title="No members found"
      description="No members match your search criteria. Try adjusting your filters."
      action={onClear ? { label: "Clear filters", onClick: onClear } : undefined}
    />
  );
}

export function EmptyEvents() {
  return (
    <EmptyState
      icon="calendar"
      title="No events scheduled"
      description="There are no upcoming events at the moment. Check back later!"
    />
  );
}

export function EmptyNews() {
  return (
    <EmptyState
      icon="news"
      title="No news available"
      description="There are no news articles at the moment."
    />
  );
}

export function EmptyPosts() {
  return (
    <EmptyState
      icon="message"
      title="No posts yet"
      description="Be the first to share something with the community!"
    />
  );
}

export function EmptyGallery() {
  return (
    <EmptyState
      icon="image"
      title="No photos yet"
      description="Photos will appear here once they're uploaded."
    />
  );
}

export function EmptyDocuments() {
  return (
    <EmptyState
      icon="file"
      title="No documents"
      description="There are no documents available at the moment."
    />
  );
}

export function EmptyMatrimony() {
  return (
    <EmptyState
      icon="heart"
      title="No profiles found"
      description="No matrimony profiles match your criteria. Try adjusting your filters."
    />
  );
}

export function EmptyNotifications() {
  return (
    <EmptyState
      icon="bell"
      title="All caught up!"
      description="You don't have any notifications at the moment."
    />
  );
}
