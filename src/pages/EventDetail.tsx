import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  CheckCircle,
  Star,
  X,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { eventsApi, userApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ShareDialog } from "@/components/dialogs/ShareDialog";

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const eventId = id ? parseInt(id, 10) : NaN;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${eventId}` : "";

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsApi.getById(eventId),
    enabled: Number.isInteger(eventId),
  });

  const { data: analytics } = useQuery({
    queryKey: ["event-analytics", eventId],
    queryFn: () => eventsApi.getAnalytics(eventId),
    enabled: Number.isInteger(eventId) && !!event?.isOrganizer,
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ status, displayName, photoUrl }: { status: string; displayName?: string; photoUrl?: string }) =>
      eventsApi.rsvp(eventId, { status, displayName, photoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-analytics", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast({ title: "RSVP updated" });
    },
    onError: (err: unknown) => {
      toast({
        title: "Failed to update RSVP",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    },
  });

  const handleRsvp = async (status: string) => {
    let displayName: string | undefined;
    let photoUrl: string | undefined;
    try {
      const profile = await userApi.getProfile();
      if (profile?.fullName) displayName = profile.fullName;
      if (profile?.avatarUrl) photoUrl = profile.avatarUrl;
    } catch {
      // use without profile
    }
    rsvpMutation.mutate({ status, displayName, photoUrl });
  };

  if (isLoading || !event) {
    return (
      <AppLayout title="Event">
        <div className="p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {error && (
              <p className="text-destructive mb-4">
                {error instanceof Error ? error.message : "Failed to load event"}
              </p>
            )}
            {isLoading && <p className="text-muted-foreground">Loading…</p>}
          </div>
        </div>
      </AppLayout>
    );
  }

  const dateFormatted = event.date
    ? new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <AppLayout title={event.title}>
      <div className="p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Link to="/events">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Events
            </Button>
          </Link>

          {/* Two–three column: When / What / Where */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* When */}
            <Card className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">When</p>
                    <p>{dateFormatted}</p>
                    {event.time && <p className="text-sm">{event.time}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* What */}
            <Card className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Badge className="bg-purple-100 text-purple-700 flex-shrink-0">{event.type}</Badge>
                  <div>
                    <p className="text-sm font-medium text-foreground">What</p>
                    <p className="font-semibold">{event.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Where */}
            <Card className="border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Where</p>
                    <p>{event.location}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Event image */}
          {event.imageUrl && (
            <div className="rounded-2xl overflow-hidden">
              <OptimizedImage
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-48 md:h-72 object-cover"
                showSkeleton
              />
            </div>
          )}

          {/* Attendees & RSVP (only for non-organizer) */}
          <Card className="border-0 shadow-card">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium">{event.goingCount} attending</span>
                  <div className="flex -space-x-2">
                    {(event.goingAttendees ?? []).slice(0, 6).map((attendee, i) => (
                      <Avatar key={i} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={attendee.photoUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {attendee.displayName
                            ? attendee.displayName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
                {!event.isOrganizer && (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      className={cn(
                        event.currentUserRsvpStatus === "going" && "bg-green-600 hover:bg-green-700"
                      )}
                      onClick={() => handleRsvp("going")}
                      disabled={rsvpMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Going
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        event.currentUserRsvpStatus === "interested" && "border-primary bg-primary/10"
                      )}
                      onClick={() => handleRsvp("interested")}
                      disabled={rsvpMutation.isPending}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Interested
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        event.currentUserRsvpStatus === "not_going" && "text-muted-foreground"
                      )}
                      onClick={() => handleRsvp("not_going")}
                      disabled={rsvpMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Can't Go
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {event.description && (
            <div>
              <h2 className="text-lg font-semibold mb-3">About This Event</h2>
              <p className="text-muted-foreground whitespace-pre-line">{event.description}</p>
            </div>
          )}

          {/* Schedule */}
          {event.schedule && event.schedule.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Event Schedule</h2>
              <div className="space-y-3">
                {event.schedule.map((item, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="w-24 flex-shrink-0">
                      <span className="text-sm font-medium text-primary">{item.time}</span>
                    </div>
                    <div className="flex-1 pb-3 border-b border-border last:border-0">
                      <span className="text-sm">{item.activity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organized By - link to member profile */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Organized By</h2>
            <Link
              to={event.organizer?.userId ? `/user/${event.organizer.userId}` : "#"}
              className={event.organizer?.userId ? "block" : "pointer-events-none"}
            >
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={event.organizer?.photoUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {event.organizer?.displayName
                      ? event.organizer.displayName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "OR"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {event.organizer?.displayName || "Organizer"}
                  </p>
                  <p className="text-sm text-muted-foreground">Event Organizer</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Analytics (for organizer; privacy-aware: show who did what) */}
          {event.isOrganizer && analytics && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-green-600">{analytics.goingCount}</p>
                    <p className="text-sm text-muted-foreground">Going</p>
                    {analytics.goingAttendees?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {analytics.goingAttendees.slice(0, 5).map((a, i) => (
                          <Avatar key={i} className="h-6 w-6">
                            <AvatarImage src={a.photoUrl ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {a.displayName?.slice(0, 1) ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-amber-600">{analytics.interestedCount}</p>
                    <p className="text-sm text-muted-foreground">Interested</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-muted-foreground">
                      {analytics.notGoingCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Can't Go</p>
                  </CardContent>
                </Card>
              </div>

              {/* Attendees tab: full list of Going and Interested with details (privacy-respected) */}
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-3">Attendees</h2>
                <div className="space-y-6">
                  {analytics.goingAttendees?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-green-600 mb-2">Going ({analytics.goingCount})</h3>
                      <ul className="space-y-2">
                        {analytics.goingAttendees.map((a, i) => (
                          <li key={a.userId || i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={a.photoUrl ?? undefined} />
                              <AvatarFallback className="text-sm">
                                {a.displayName?.slice(0, 2).toUpperCase() ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{a.displayName ?? "Attendee"}</p>
                              {a.email && (
                                <a href={`mailto:${a.email}`} className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{a.email}</span>
                                </a>
                              )}
                              {a.phone && (
                                <a href={`tel:${a.phone}`} className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {a.phone}
                                </a>
                              )}
                            </div>
                            <Link to={`/user/${a.userId}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <User className="h-4 w-4" />
                                Profile
                              </Button>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analytics.interestedAttendees?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-amber-600 mb-2">Interested ({analytics.interestedCount})</h3>
                      <ul className="space-y-2">
                        {analytics.interestedAttendees.map((a, i) => (
                          <li key={a.userId || i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={a.photoUrl ?? undefined} />
                              <AvatarFallback className="text-sm">
                                {a.displayName?.slice(0, 2).toUpperCase() ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{a.displayName ?? "Attendee"}</p>
                              {a.email && (
                                <a href={`mailto:${a.email}`} className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{a.email}</span>
                                </a>
                              )}
                              {a.phone && (
                                <a href={`tel:${a.phone}`} className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  {a.phone}
                                </a>
                              )}
                            </div>
                            <Link to={`/user/${a.userId}`}>
                              <Button variant="ghost" size="sm" className="gap-1">
                                <User className="h-4 w-4" />
                                Profile
                              </Button>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(!analytics.goingAttendees?.length && !analytics.interestedAttendees?.length) && (
                    <p className="text-sm text-muted-foreground">No attendees yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions: Share Event – opens ShareDialog with event URL */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Share Event
            </Button>
          </div>

          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            title={event.title}
            url={shareUrl}
          />
        </div>
      </div>
    </AppLayout>
  );
}
