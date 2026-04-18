import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, MapPin, Briefcase, CalendarCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { OptimizedAvatar } from "./optimized-image";

function getWhatsAppUrl(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const num = d.startsWith("91") && d.length >= 12 ? d : d.length === 10 ? "91" + d : d.replace(/^0/, "91");
  return `https://wa.me/${num}`;
}

function formatMemberSince(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

interface MemberCardProps {
  id: string;
  /** When set, links to /profile/{profileKey} (public handle); otherwise /user/{id} (UUID). */
  profileKey?: string | null;
  name: string;
  avatar?: string;
  profession?: string;
  city: string;
  phone?: string;
  bloodGroup?: string;
  relation?: string;
  memberSince?: string | null;
  variant?: "default" | "compact" | "grid";
}

export function MemberCard({
  id,
  profileKey,
  name,
  avatar,
  profession,
  city,
  phone,
  bloodGroup,
  relation,
  memberSince,
  variant = "default",
}: MemberCardProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const profileHref = profileKey
    ? `/profile/${encodeURIComponent(profileKey)}`
    : `/user/${id}`;

  if (variant === "compact") {
    return (
      <Link 
        to={profileHref}
        className="flex items-center gap-3 p-3 min-w-0 rounded-xl bg-card hover:bg-muted/50 transition-colors touch-manipulation"
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{name}</h3>
          <p className="text-xs text-muted-foreground truncate">{profession} • {city}</p>
        </div>
        {bloodGroup && (
          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
            {bloodGroup}
          </Badge>
        )}
      </Link>
    );
  }

  if (variant === "grid") {
    return (
      <Link
        to={profileHref}
        className={cn(
          "group block w-full min-w-0 rounded-xl sm:rounded-2xl p-3 sm:p-4",
          "bg-card shadow-card hover:shadow-card-hover transition-all duration-300",
          "text-left sm:text-center"
        )}
      >
        <h3 className="font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors order-first" title={name}>
          {name}
        </h3>
        <Avatar className="h-14 w-14 sm:h-20 sm:w-20 mx-0 sm:mx-auto mb-2 sm:mb-3 mt-2 ring-2 sm:ring-4 ring-background shadow-lg group-hover:ring-primary/20 transition-all shrink-0">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl">{initials}</AvatarFallback>
        </Avatar>
        {relation && <p className="text-xs text-muted-foreground mt-0.5 truncate">{relation}</p>}
        {profession && <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{profession}</p>}
        <div className="flex items-center justify-center sm:justify-center gap-1 mt-1.5 sm:mt-2 text-xs text-muted-foreground min-w-0">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{city || "—"}</span>
        </div>
        {memberSince != null && (
          <div className="flex items-center justify-center sm:justify-center gap-1 mt-1 text-xs text-muted-foreground">
            <CalendarCheck className="h-3 w-3 shrink-0" />
            <span className="truncate">Since {formatMemberSince(memberSince)}</span>
          </div>
        )}
        {bloodGroup && (
          <Badge variant="outline" className="mt-1.5 sm:mt-2 text-xs bg-destructive/10 text-destructive border-destructive/20">
            {bloodGroup}
          </Badge>
        )}
        {phone && (
          <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row gap-2" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" className="w-full min-h-10 touch-manipulation" asChild>
              <a href={`tel:${phone.replace(/\s/g, "")}`}>
                <Phone className="h-4 w-4 mr-1.5 shrink-0" />
                Call
              </a>
            </Button>
            <Button size="sm" variant="outline" className="w-full min-h-10 touch-manipulation" asChild>
              <a href={getWhatsAppUrl(phone)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
                WhatsApp
              </a>
            </Button>
          </div>
        )}
      </Link>
    );
  }

  return (
    <Link
      to={profileHref}
      className={cn(
        "flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 min-w-0",
        "rounded-xl sm:rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300"
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary text-base sm:text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <h3 className="font-semibold text-sm sm:text-base truncate group-hover:text-primary transition-colors" title={name}>
              {name}
            </h3>
            {bloodGroup && (
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20 flex-shrink-0">
                {bloodGroup}
              </Badge>
            )}
          </div>
          {relation && <p className="text-xs text-muted-foreground truncate">{relation}</p>}
          <div className="mt-1 space-y-0.5 sm:space-y-1">
            {profession && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{profession}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{city || "—"}</span>
            </div>
            {memberSince != null && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarCheck className="h-3 w-3 shrink-0" />
                <span className="truncate">Since {formatMemberSince(memberSince)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {phone && (
        <div className="flex gap-2 flex-shrink-0 sm:self-center" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="flex-1 min-w-0 min-h-10 touch-manipulation" asChild>
            <a href={`tel:${phone.replace(/\s/g, "")}`}>
              <Phone className="h-4 w-4 mr-1.5 shrink-0" />
              Call
            </a>
          </Button>
          <Button size="sm" variant="outline" className="flex-1 min-w-0 min-h-10 touch-manipulation" asChild>
            <a href={getWhatsAppUrl(phone)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-1.5 shrink-0" />
              WhatsApp
            </a>
          </Button>
        </div>
      )}
    </Link>
  );
}
