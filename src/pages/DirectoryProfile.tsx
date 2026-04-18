import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  Briefcase,
  Droplets,
} from "lucide-react";
import { directoryApi, type DirectoryActionDto } from "@/lib/api";

function getInitials(name: string): string {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getActionIcon(type: string) {
  switch (type.toUpperCase()) {
    case "CALL": return <Phone className="h-4 w-4" />;
    case "WHATSAPP": return <MessageCircle className="h-4 w-4" />;
    case "EMAIL": return <Mail className="h-4 w-4" />;
    default: return <LinkIcon className="h-4 w-4" />;
  }
}

function getActionHref(action: DirectoryActionDto): string {
  const t = action.type.toUpperCase();
  if (t === "CALL") return `tel:${action.value.replace(/\s/g, "")}`;
  if (t === "EMAIL") return `mailto:${action.value}`;
  if (t === "WHATSAPP") {
    const d = action.value.replace(/\D/g, "");
    const num = d.startsWith("91") && d.length >= 12 ? d : d.length === 10 ? "91" + d : d;
    return `https://wa.me/${num}`;
  }
  return action.value.startsWith("http") ? action.value : `https://${action.value}`;
}

function shouldOpenNewTab(type: string): boolean {
  const t = type.toUpperCase();
  return t === "WHATSAPP" || t === "LINK";
}

export default function DirectoryProfile() {
  const { id } = useParams<{ id: string }>();

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ["directory", "profile", id],
    queryFn: () => directoryApi.get(id!),
    enabled: !!id,
  });

  if (isLoading || !id) {
    return (
      <AppLayout title="Profile">
        <div className="p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <BackButton />
            <div className="mt-6 space-y-4">
              <div className="h-32 bg-muted/60 rounded-xl animate-pulse" />
              <div className="h-20 bg-muted/60 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError || !profile) {
    return (
      <AppLayout title="Profile">
        <div className="p-4 md:p-6">
          <div className="max-w-2xl mx-auto">
            <BackButton />
            <Card className="mt-6 border-0 shadow-card">
              <CardContent className="py-12 text-center">
                <p className="text-destructive">
                  {error instanceof Error ? error.message : "This profile is not available."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayName = profile.fullName || "Member";
  const initials = getInitials(displayName);

  return (
    <AppLayout title={displayName}>
      <div className="min-h-screen bg-muted/30">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="max-w-2xl mx-auto px-4 py-2">
            <BackButton />
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
          {/* Profile header */}
          <Card className="border-0 shadow-card overflow-hidden">
            <div className="h-24 md:h-32 bg-gradient-to-r from-primary/20 to-primary/5" />
            <CardContent className="pt-0 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg shrink-0">
                  <AvatarImage src={profile.photoUrl ?? undefined} />
                  <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold truncate">{displayName}</h1>
                  {profile.profession && (
                    <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />
                      {profile.profession}
                    </p>
                  )}
                  {profile.city && (
                    <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {profile.city}
                    </p>
                  )}
                </div>
                {profile.bloodGroup && (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">
                    <Droplets className="h-3 w-3 mr-1" />
                    {profile.bloodGroup}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bio */}
          {profile.bio && (
            <Card className="border-0 shadow-card">
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground whitespace-pre-line">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Contact info */}
          {(profile.phone || profile.email) && (
            <Card className="border-0 shadow-card">
              <CardContent className="py-4 space-y-2">
                {profile.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${profile.phone}`} className="text-primary hover:underline">{profile.phone}</a>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${profile.email}`} className="text-primary hover:underline">{profile.email}</a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dynamic action buttons */}
          {profile.actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {profile.actions.map((action, i) => {
                  const href = getActionHref(action);
                  const newTab = shouldOpenNewTab(action.type);
                  return (
                    <Button
                      key={i}
                      variant="outline"
                      className="gap-2 justify-start"
                      asChild
                    >
                      <a
                        href={href}
                        {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {getActionIcon(action.type)}
                        <span className="truncate">{action.label}</span>
                      </a>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function BackButton() {
  return (
    <Link to="/directory">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2">
        <ChevronLeft className="h-4 w-4" />
        Back to Directory
      </Button>
    </Link>
  );
}
