import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { OptimizedImage } from "./optimized-image";

interface EventCardProps {
  id: string | number;
  title: string;
  type: string;
  date: string;
  time?: string | null;
  location: string;
  attendees?: number;
  rsvpStatus?: "going" | "interested" | "not_going" | null;
  image?: string | null;
  variant?: "default" | "compact" | "calendar";
}

export function EventCard({
  id,
  title,
  type,
  date,
  time,
  location,
  attendees,
  rsvpStatus,
  image,
  variant = "default",
}: EventCardProps) {
  const typeColors: Record<string, string> = {
    wedding: "bg-pink-100 text-pink-700 border-pink-200",
    meeting: "bg-blue-100 text-blue-700 border-blue-200",
    cultural: "bg-purple-100 text-purple-700 border-purple-200",
    religious: "bg-amber-100 text-amber-700 border-amber-200",
    social: "bg-green-100 text-green-700 border-green-200",
  };

  const rsvpColors = {
    going: "bg-success text-success-foreground",
    interested: "bg-secondary text-secondary-foreground",
    not_going: "bg-muted text-muted-foreground",
  };

  // Parse date for calendar variant
  const dateObj = new Date(date);
  const day = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

  const idStr = String(id);
  if (variant === "compact") {
    return (
      <Link 
        to={`/events/${idStr}`}
        className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium text-primary uppercase">{month}</span>
          <span className="text-lg font-bold text-primary leading-none">{day}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{title}</h3>
          <p className="text-xs text-muted-foreground truncate">{(time || "") && `${time} • `}{location}</p>
        </div>
        <Badge variant="outline" className={cn("text-xs flex-shrink-0", typeColors[type.toLowerCase()] || "")}>
          {type}
        </Badge>
      </Link>
    );
  }

  if (variant === "calendar") {
    return (
      <Link 
        to={`/events/${idStr}`}
        className="block p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-left"
      >
        <p className="text-xs font-medium text-primary truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{time ?? ""}</p>
      </Link>
    );
  }

  return (
    <Link 
      to={`/events/${idStr}`}
      className="group block rounded-2xl overflow-hidden bg-card shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      {image && (
        <div className="aspect-[2/1] overflow-hidden">
          <OptimizedImage 
            src={image} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            showSkeleton={true}
          />
        </div>
      )}
      <div className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className={cn("text-xs", typeColors[type.toLowerCase()] || "")}>
            {type}
          </Badge>
          {rsvpStatus && (
            <Badge className={cn("text-xs", rsvpColors[rsvpStatus])}>
              {rsvpStatus === "going" ? "Going" : rsvpStatus === "interested" ? "Interested" : "Not Going"}
            </Badge>
          )}
        </div>
        
        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{title}</h3>
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>{date}</span>
          </div>
          {(time ?? "") && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>{time}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="truncate">{location}</span>
          </div>
          {attendees !== undefined && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>{attendees} attending</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button size="sm" className="flex-1" type="button">RSVP</Button>
          <Button size="sm" variant="outline" type="button">Details</Button>
        </div>
      </div>
    </Link>
  );
}
