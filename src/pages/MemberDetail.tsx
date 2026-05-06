import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  MapPin,
  Phone,
  Mail,
  Grid3X3,
  Share2,
  Flag,
  Calendar,
  Siren,
  Pencil,
  Settings,
  Camera,
  MoreHorizontal,
  MessageCircle,
  UserPlus,
  Droplets,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditProfileDialog } from "@/components/dialogs/EditProfileDialog";
import { RequestContactDialog } from "@/components/dialogs/RequestContactDialog";
import { ChangeBackgroundDialog } from "@/components/dialogs/ChangeBackgroundDialog";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useAuth } from "@/context/AuthContext";
import { userApi, eventsApi, communityApi, emergencyApi, chatApi } from "@/lib/api";
import type { CommunityPost, CommunityPostMedia, EmergencyItem, EventItem } from "@/lib/api";
import { cn } from "@/lib/utils";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function postCover(post: CommunityPost): string | undefined {
  const media = post.media ?? [];
  return media.find((m) => m.type === "IMAGE")?.url ?? media[0]?.url;
}

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changeBgOpen, setChangeBgOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<CommunityPostMedia[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [contactRequestOpen, setContactRequestOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const { data: profile, isLoading, error, isError } = useQuery({
    queryKey: ["publicProfile", id],
    queryFn: () => userApi.getPublicProfileByRef(id!),
    enabled: !!id,
    staleTime: 0,
  });

  const { data: ownerProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: userApi.getProfile,
    enabled: !!me && !!profile && profile.userId === me.id,
  });

  const profileUserId = profile?.userId;
  const isOwner = !!me && !!profile && profile.userId === me.id;

  const { data: eventsData } = useQuery({
    queryKey: ["profileEvents", profileUserId],
    queryFn: () => eventsApi.list({ organizerId: profileUserId! }),
    enabled: !!profileUserId && !!profile?.showEventsOnProfile,
  });

  const { data: postsData } = useQuery({
    queryKey: ["profilePosts", profileUserId],
    queryFn: () => communityApi.list({ authorId: profileUserId!, page: 0, size: 24 }),
    enabled: !!profileUserId && !!profile?.showCommunityOnProfile,
  });

  const { data: emergenciesData } = useQuery({
    queryKey: ["profileEmergencies", profileUserId],
    queryFn: () => emergencyApi.listAll({ creatorUserId: profileUserId! }),
    enabled: !!profileUserId && !!profile?.showEmergenciesOnProfile,
  });

  const events: EventItem[] = eventsData ?? [];
  const posts: CommunityPost[] = postsData?.content ?? [];
  const emergencies: EmergencyItem[] = emergenciesData ?? [];
  const stats = useMemo(
    () => ({
      posts: postsData?.totalElements ?? posts.length,
      events: events.length,
      sos: emergencies.length,
    }),
    [postsData?.totalElements, posts.length, events.length, emergencies.length],
  );

  const profileUrl = (() => {
    const key = profile?.profileKey;
    const path = key
      ? `/profile/${encodeURIComponent(key)}`
      : profile?.userId
        ? `/user/${profile.userId}`
        : "";
    return `${window.location.origin}${path}`;
  })();

  const handleKey = profile?.profileKey ?? id ?? "";

  const startDirectChat = async () => {
    if (!profile?.userId) return;
    setChatLoading(true);
    try {
      const conv = await chatApi.openDirect(profile.userId);
      navigate(`/chat/${conv.id}`);
    } catch (err) {
      toast({
        title: "Could not open chat",
        description: err instanceof Error ? err.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: profile?.fullName || "Profile", url: profileUrl });
        return;
      }
    } catch { /* ignore */ }
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({ title: "Link copied", description: "Profile link copied to clipboard." });
    } catch {
      toast({ title: "Could not copy", description: profileUrl, variant: "destructive" });
    }
  };

  const openPost = (post: CommunityPost) => {
    const media = post.media ?? [];
    if (media.length === 0) return;
    setLightboxMedia(media);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading || !id) {
    return (
      <AppLayout mobileHeader={<></>}>
        <div className="min-h-screen bg-background">
          {/* Sticky header skeleton */}
          <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3">
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Skeleton className="h-4 w-32" />
              <div className="w-10" />
            </div>
          </div>
          <div className="mx-auto max-w-4xl px-3 pt-4 space-y-4">
            <div className="rounded-2xl border overflow-hidden">
              <Skeleton className="h-36 w-full" />
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-20 w-20 rounded-full -mt-12" />
                  <div className="grid flex-1 grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
                  </div>
                </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-64" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-9 rounded-xl" />
                  <Skeleton className="h-9 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (isError || !profile) {
    return (
      <AppLayout mobileHeader={<></>}>
        <div className="min-h-screen bg-background">
          <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-4xl items-center px-3">
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center gap-3">
            <p className="text-destructive font-semibold">
              {error instanceof Error ? error.message : "Profile not found"}
            </p>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
              Go back
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayName = profile.fullName || "Member";
  const initials = initialsOf(displayName);

  return (
    // mobileHeader={<></>} suppresses the default MobileHeader so the page's
    // own sticky header (below) is the single source of the username — no duplication.
    <AppLayout mobileHeader={<></>}>
      <div className="min-h-screen bg-background">

        {/* ── Sticky top nav ───────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl shrink-0"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex flex-col items-center min-w-0 flex-1 px-2">
              <p className="font-semibold text-sm truncate leading-tight">
                {handleKey}
              </p>
              {isOwner && (
                <p className="text-[10px] text-muted-foreground leading-tight">Your profile</p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isOwner ? (
                <Button variant="ghost" size="icon" className="rounded-xl" asChild aria-label="Settings">
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl"
                  aria-label="More options"
                  onClick={() => {
                    toast({ title: "Report submitted", description: "Thank you. We will review this profile." });
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-3 pb-10 pt-3 space-y-3">

          {/* ── Profile card ───────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border/70 overflow-hidden bg-card shadow-sm">

            {/* Cover image */}
            <div
              className="relative h-32 md:h-44 bg-cover bg-center"
              style={{
                backgroundImage: profile.coverImageUrl
                  ? `url(${profile.coverImageUrl})`
                  : undefined,
                background: profile.coverImageUrl
                  ? undefined
                  : "linear-gradient(135deg, hsl(var(--primary)/0.25) 0%, hsl(var(--primary)/0.08) 50%, hsl(var(--primary)/0.15) 100%)",
              }}
            >
              {isOwner && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-full bg-background/80 hover:bg-background shadow"
                  onClick={() => setChangeBgOpen(true)}
                  aria-label="Change cover photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="px-4 pb-5 pt-3 space-y-4">
              {/* Avatar + Stats row */}
              <div className="flex items-start gap-4">
                <div className="-mt-14 shrink-0">
                  <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-md ring-1 ring-border">
                    <AvatarImage src={profile.avatarUrl ?? undefined} alt={displayName} />
                    <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="rounded-xl bg-muted/50 px-2 py-2.5">
                    <div className="text-lg font-bold leading-none">{stats.posts}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Posts</div>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-2 py-2.5">
                    <div className="text-lg font-bold leading-none">{stats.events}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Events</div>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-2 py-2.5">
                    <div className="text-lg font-bold leading-none">{stats.sos}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">SOS</div>
                  </div>
                </div>
              </div>

              {/* Name + Username + Bio */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-bold text-lg leading-tight">{displayName}</h1>
                  {profile.bloodGroup && (
                    <Badge className="border-destructive/20 bg-destructive/10 text-destructive text-[11px] gap-1">
                      <Droplets className="h-2.5 w-2.5" />
                      {profile.bloodGroup}
                    </Badge>
                  )}
                </div>

                {/* @handle shown only if different from displayName */}
                {handleKey && (
                  <p className="text-sm text-muted-foreground">@{handleKey}</p>
                )}

                {/* Profession + City */}
                {(profile.profession || profile.city) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {profile.profession && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {profile.profession}
                      </span>
                    )}
                    {profile.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {profile.city}
                      </span>
                    )}
                  </div>
                )}

                {profile.bio && (
                  <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                {isOwner ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-9 rounded-xl gap-1.5 font-semibold"
                      onClick={() => setEditProfileOpen(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit profile
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 rounded-xl gap-1.5 font-semibold"
                      onClick={handleShare}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="h-9 rounded-xl gap-1.5 font-semibold"
                        disabled={chatLoading}
                        onClick={() => void startDirectChat()}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {chatLoading ? "Opening…" : "Message"}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 rounded-xl gap-1.5 font-semibold"
                        onClick={() => setContactRequestOpen(true)}
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Connect
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="h-9 w-full rounded-xl gap-1.5 font-semibold"
                      onClick={handleShare}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share profile
                    </Button>
                  </>
                )}
              </div>

              {/* Contact quick actions */}
              {(profile.phone || profile.email) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {profile.phone && (
                    <Button
                      asChild
                      size="sm"
                      className="h-8 rounded-xl gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <a href={`tel:${profile.phone}`}>
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    </Button>
                  )}
                  {profile.email && (
                    <Button
                      variant="outline"
                      asChild
                      size="sm"
                      className="h-8 rounded-xl gap-1.5"
                    >
                      <a href={`mailto:${profile.email}`}>
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Content tabs ───────────────────────────────────────────────── */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/50 h-10">
              <TabsTrigger value="posts" className="gap-1.5 rounded-lg text-xs font-semibold">
                <Grid3X3 className="h-3.5 w-3.5" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-1.5 rounded-lg text-xs font-semibold">
                <Calendar className="h-3.5 w-3.5" />
                Events
              </TabsTrigger>
              <TabsTrigger value="sos" className="gap-1.5 rounded-lg text-xs font-semibold">
                <Siren className="h-3.5 w-3.5" />
                SOS
              </TabsTrigger>
            </TabsList>

            {/* Posts grid */}
            <TabsContent value="posts" className="mt-2">
              {!profile.showCommunityOnProfile ? (
                <EmptyTabCard message="Posts hidden by profile privacy settings." />
              ) : posts.length === 0 ? (
                <EmptyTabCard
                  message={isOwner ? "You haven't posted anything yet." : "No posts yet."}
                  action={
                    isOwner ? (
                      <Button variant="outline" size="sm" className="rounded-xl mt-2" asChild>
                        <Link to="/feeds">Create your first post</Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-3 gap-0.5 rounded-xl overflow-hidden">
                  {posts.map((post) => {
                    const cover = postCover(post);
                    return (
                      <button
                        key={post.id}
                        type="button"
                        className={cn(
                          "relative aspect-square overflow-hidden bg-muted/40",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          cover && "cursor-zoom-in",
                        )}
                        onClick={() => openPost(post)}
                        aria-label="Open post"
                      >
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] text-muted-foreground leading-snug">
                            {post.content.slice(0, 50)}
                          </div>
                        )}
                        {/* Multi-image indicator */}
                        {(post.media ?? []).length > 1 && (
                          <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white text-[10px] font-semibold flex items-center justify-center">
                            {post.media.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Events */}
            <TabsContent value="events" className="mt-2">
              {!profile.showEventsOnProfile ? (
                <EmptyTabCard message="Events hidden by profile privacy settings." />
              ) : events.length === 0 ? (
                <EmptyTabCard
                  message={isOwner ? "No events created yet." : "No events yet."}
                  action={
                    isOwner ? (
                      <Button variant="outline" size="sm" className="rounded-xl mt-2" asChild>
                        <Link to="/events">Browse events</Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 20).map((ev) => (
                    <Link
                      key={ev.id}
                      to={`/events/${ev.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{ev.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ev.date}
                          {ev.location ? ` • ${ev.location}` : ""}
                        </p>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* SOS / Emergency */}
            <TabsContent value="sos" className="mt-2">
              {!profile.showEmergenciesOnProfile ? (
                <EmptyTabCard message="SOS posts hidden by profile privacy settings." />
              ) : emergencies.length === 0 ? (
                <EmptyTabCard message="No SOS posts." />
              ) : (
                <div className="space-y-2">
                  {emergencies.slice(0, 20).map((em) => (
                    <Link
                      key={em.id}
                      to={`/emergency/${em.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                        <Siren className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{em.title}</p>
                        <p className="truncate text-xs capitalize text-muted-foreground">
                          {em.status.toLowerCase().replace("_", " ")}
                          {em.city ? ` • ${em.city}` : ""}
                        </p>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Report button for non-owners */}
          {!isOwner && (
            <div className="text-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-2 text-xs"
                onClick={() => {
                  toast({ title: "Report submitted", description: "Thank you. We will review this profile." });
                }}
              >
                <Flag className="h-3.5 w-3.5" />
                Report this profile
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      {!isOwner && profile && (
        <RequestContactDialog
          open={contactRequestOpen}
          onOpenChange={setContactRequestOpen}
          targetUserId={profile.userId}
          targetName={displayName}
        />
      )}

      {isOwner && (
        <>
          <EditProfileDialog
            open={editProfileOpen}
            onOpenChange={setEditProfileOpen}
            profile={ownerProfile ?? null}
            user={me}
            onProfileUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              queryClient.invalidateQueries({ queryKey: ["publicProfile", id] });
            }}
          />
          <ChangeBackgroundDialog
            open={changeBgOpen}
            onOpenChange={setChangeBgOpen}
            currentUrl={profile.coverImageUrl}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              queryClient.invalidateQueries({ queryKey: ["publicProfile", id] });
            }}
          />
        </>
      )}

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        media={lightboxMedia.map((m) => ({ id: m.id, url: m.url, type: m.type }))}
        initialIndex={lightboxIndex}
      />
    </AppLayout>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function EmptyTabCard({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
