import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Clock, MapPin, AlertTriangle } from "lucide-react";

interface EmergencyCardProps {
  id: string;
  title: string;
  description: string;
  location: string;
  contact: string;
  postedAt: string;
  isActive?: boolean;
  variant?: "default" | "banner";
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
}

export function EmergencyCard({
  id,
  title,
  description,
  location,
  contact,
  postedAt,
  isActive = true,
  variant = "default",
  phoneNumber,
  whatsappNumber,
}: EmergencyCardProps) {
  if (variant === "banner") {
    return (
      <div className={cn(
        "rounded-2xl p-4 border-2",
        isActive 
          ? "bg-emergency/10 border-emergency animate-pulse-soft" 
          : "bg-muted border-muted-foreground/20"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-xl",
            isActive ? "bg-emergency text-emergency-foreground" : "bg-muted-foreground/20"
          )}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold",
              isActive ? "text-emergency" : "text-muted-foreground"
            )}>
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {postedAt}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {phoneNumber && (
              <Button size="sm" variant={isActive ? "destructive" : "outline"} asChild>
                <a href={`tel:${phoneNumber}`}>
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-2xl overflow-hidden border-2",
      isActive 
        ? "bg-emergency/5 border-emergency" 
        : "bg-card border-border"
    )}>
      <div className={cn(
        "px-4 py-2 flex items-center gap-2",
        isActive ? "bg-emergency text-emergency-foreground" : "bg-muted text-muted-foreground"
      )}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-semibold">
          {isActive ? "Active Emergency" : "Resolved"}
        </span>
        <span className="text-xs ml-auto opacity-80">{postedAt}</span>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
        
        <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{location}</span>
        </div>

        {isActive && (
          <div className="mt-4 flex gap-2">
            {phoneNumber && (
              <Button className="flex-1 bg-emergency hover:bg-emergency/90" asChild>
                <a href={`tel:${phoneNumber}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call Now
                </a>
              </Button>
            )}
            {whatsappNumber && (
              <Button
                variant="outline"
                className="flex-1 border-emergency text-emergency hover:bg-emergency/10"
                asChild
              >
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                    `Hi, I saw your emergency request on the dashboard.\nI want to help you.\nEmergency ID: ${id}`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
