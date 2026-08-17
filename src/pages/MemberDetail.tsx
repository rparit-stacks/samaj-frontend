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
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditProfileDialog } from "@/components/dialogs/EditProfileDialog";
import { RequestContactDialog } from "@/components/dialogs/RequestContactDialog";
import { ChangeBackgroundDialog } from "@/components/dialogs/ChangeBackgroundDialog";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useAuth } from "@/context/AuthContext";
import { userApi, eventsApi, communityApi, emergencyApi, chatApi } from "@/lib/api";
import type { CommunityPost, CommunityPostMedia, EmergencyItem, EventItem, PublicProfileResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { buildShareUrl } from "@/lib/shareLinks";

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

  const { data: profile, isLoading, error, isError, refetch, isFetching } = useQuery({
    queryKey: ["publicProfile", id],
    queryFn: () => userApi.getPublicProfileByRef(id!),
    enabled: !!id,
    staleTime: 30_000,
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
    return buildShareUrl(path);
  })();

  const handleKey = profile?.profileKey ?? id ?? "";

  const patchPublicCover = (nextUrl: string | null) => {
    queryClient.setQueryData<PublicProfileResponse>(["publicProfile", id], (prev) =>
      prev ? { ...prev, coverImageUrl: nextUrl } : prev,
    );
    queryClient.setQueryData(["profile"], (prev: { coverImageUrl?: string | null } | undefined) =>
      prev ? { ...prev, coverImageUrl: nextUrl } : prev,
    );
  };

  const patchPublicAvatar = (nextUrl: string | null) => {
    queryClient.setQueryData<PublicProfileResponse>(["publicProfile", id], (prev) =>
      prev ? { ...prev, avatarUrl: nextUrl } : prev,
    );
  };

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
    } catch {
      /* ignore */
    }
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

  if (isLoading || !id) {
    return (
      <AppLayout mobileHeader={<></>}>
        <div className="bg-background pb-nav-safe">
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="mx-auto max-w-lg px-4 -mt-10 space-y-4">
            <Skeleton className="h-20 w-20 rounded-full border-4 border-background" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 rounded-lg" />
              <Skeleton className="h-9 rounded-lg" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError || !profile) {
    return (
      <AppLayout mobileHeader={<></>}>
        <div className="bg-background pb-nav-safe">
          <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-12 max-w-lg items-center px-3">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
            <p className="font-semibold text-destructive">
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

  if (profile.status && profile.status !== "ACTIVE") {
    return (
      <AppLayout mobileHeader={<></>}>
        <div className="bg-background pb-nav-safe">
          <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
            <div className="mx-auto flex h-12 max-w-lg items-center px-3">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-20 text-center">
            <p className="font-semibold text-destructive">
              Your profile is not active yet. Please contact the admin or check back later.
            </p>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayName = profile.fullName || "Member";
  const initials = initialsOf(displayName);
  const coverUrl = profile.coverImageUrl?.trim() || "";

  return (
    <AppLayout mobileHeader={<></>}>
      <div className="bg-background pb-nav-safe">
        {/* Top bar — Instagram-style */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex h-12 max-w-lg items-center justify-between gap-2 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-semibold tracking-tight">{handleKey}</p>
            </div>

            <div className="flex w-9 shrink-0 justify-end">
              {isOwner ? (
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" asChild aria-label="Settings">
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  aria-label="More"
                  onClick={() => {
                    toast({ title: "Report submitted", description: "Thank you. We will review this profile." });
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-lg">
          {/* Full-bleed cover — real <img> so it doesn't vanish via CSS shorthand bugs */}
          <div className="relative h-40 w-full overflow-hidden bg-muted sm:h-48">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  // Keep layout stable if CDN flakes — hide broken image, show gradient underneath
                  (e.currentTarget as HTMLImageElement).style.opacity = "0";
                }}
              />
            ) : null}
            {!coverUrl && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--primary) / 0.35) 0%, hsl(var(--secondary) / 0.25) 50%, hsl(var(--primary) / 0.15) 100%)",
                }}
              />
            )}
            {isOwner && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-3 right-3 h-9 w-9 rounded-full border border-border/40 bg-background/90 shadow-md backdrop-blur"
                onClick={() => setChangeBgOpen(true)}
                aria-label="Change cover photo"
              >
                <Camera className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Identity block */}
          <div className="px-4 pb-3">
            <div className="flex items-end justify-between gap-3">
              <div className="relative -mt-12 shrink-0">
                <Avatar className="h-[88px] w-[88px] border-[3px] border-background shadow-md ring-1 ring-border/60">
                  <AvatarImage src={profile.avatarUrl ?? undefined} alt={displayName} className="object-cover" />
                  <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(true)}
                    className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground shadow"
                    aria-label="Edit profile photo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Instagram-style compact stats */}
              <div className="flex flex-1 items-center justify-around pb-1 pt-3">
                <Stat value={stats.posts} label="posts" />
                <Stat value={stats.events} label="events" />
                <Stat value={stats.sos} label="sos" />
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[15px] font-bold leading-tight tracking-tight">{displayName}</h1>
                {profile.bloodGroup && (
                  <Badge className="gap-1 border-destructive/20 bg-destructive/10 text-[10px] text-destructive">
                    <Droplets className="h-2.5 w-2.5" />
                    {profile.bloodGroup}
                  </Badge>
                )}
              </div>

              {(profile.profession || profile.city) && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{profile.bio}</p>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3 space-y-2">
              {isOwner ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="h-8 rounded-lg text-xs font-semibold"
                    onClick={() => setEditProfileOpen(true)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit profile
                  </Button>
                  <Button variant="secondary" className="h-8 rounded-lg text-xs font-semibold" onClick={handleShare}>
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    Share profile
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="h-8 rounded-lg text-xs font-semibold"
                      disabled={chatLoading}
                      onClick={() => void startDirectChat()}
                    >
                      <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                      {chatLoading ? "Opening…" : "Message"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-8 rounded-lg text-xs font-semibold"
                      onClick={() => setContactRequestOpen(true)}
                    >
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                      Connect
                    </Button>
                  </div>
                  <Button variant="outline" className="h-8 w-full rounded-lg text-xs font-semibold" onClick={handleShare}>
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    Share profile
                  </Button>
                </>
              )}

              {(profile.phone || profile.email) && (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {profile.phone && (
                    <Button asChild size="sm" className="h-8 gap-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700">
                      <a href={`tel:${profile.phone}`}>
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                    </Button>
                  )}
                  {profile.email && (
                    <Button variant="outline" asChild size="sm" className="h-8 gap-1.5 rounded-lg">
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

          {/* Tabs — Instagram underline vibe */}
          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="h-11 w-full justify-stretch rounded-none border-y border-border/60 bg-transparent p-0">
              <TabsTrigger
                value="posts"
                className="h-full flex-1 rounded-none border-b-2 border-transparent bg-transparent text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="h-full flex-1 rounded-none border-b-2 border-transparent bg-transparent text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <Calendar className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger
                value="sos"
                className="h-full flex-1 rounded-none border-b-2 border-transparent bg-transparent text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <Siren className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-0">
              {!profile.showCommunityOnProfile ? (
                <EmptyTabCard message="Posts hidden by privacy settings." />
              ) : posts.length === 0 ? (
                <EmptyTabCard
                  message={isOwner ? "Share your first moment with the community." : "No posts yet."}
                  action={
                    isOwner ? (
                      <Button variant="outline" size="sm" className="mt-3 rounded-xl" asChild>
                        <Link to="/feeds">Create a post</Link>
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid grid-cols-3 gap-0.5">
                  {posts.map((post) => {
                    const cover = postCover(post);
                    return (
                      <button
                        key={post.id}
                        type="button"
                        className={cn(
                          "relative aspect-square overflow-hidden bg-muted/50",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                          cover && "cursor-zoom-in",
                        )}
                        onClick={() => openPost(post)}
                        aria-label="Open post"
                      >
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[11px] leading-snug text-muted-foreground">
                            {post.content.slice(0, 50)}
                          </div>
                        )}
                        {(post.media ?? []).length > 1 && (
                          <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/55 px-1 text-[10px] font-semibold text-white">
                            {post.media.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="events" className="mt-0 px-3 py-3">
              {!profile.showEventsOnProfile ? (
                <EmptyTabCard message="Events hidden by privacy settings." />
              ) : events.length === 0 ? (
                <EmptyTabCard
                  message={isOwner ? "No events yet." : "No events yet."}
                  action={
                    isOwner ? (
                      <Button variant="outline" size="sm" className="mt-3 rounded-xl" asChild>
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
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{ev.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ev.date}
                          {ev.location ? ` • ${ev.location}` : ""}
                        </p>
                      </div>
                      <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sos" className="mt-0 px-3 py-3">
              {!profile.showEmergenciesOnProfile ? (
                <EmptyTabCard message="SOS posts hidden by privacy settings." />
              ) : emergencies.length === 0 ? (
                <EmptyTabCard message="No SOS posts." />
              ) : (
                <div className="space-y-2">
                  {emergencies.slice(0, 20).map((em) => (
                    <Link
                      key={em.id}
                      to={`/emergency/${em.id}`}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3.5 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                        <Siren className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{em.title}</p>
                        <p className="truncate text-xs capitalize text-muted-foreground">
                          {em.status.toLowerCase().replace("_", " ")}
                          {em.city ? ` • ${em.city}` : ""}
                        </p>
                      </div>
                      <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {!isOwner && (
            <div className="py-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs text-muted-foreground"
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
            onProfileUpdated={(updated) => {
              if (updated) {
                queryClient.setQueryData(["profile"], updated);
                patchPublicAvatar(updated.avatarUrl ?? null);
                if (updated.coverImageUrl !== undefined) {
                  patchPublicCover(updated.coverImageUrl ?? null);
                }
              }
              void queryClient.invalidateQueries({ queryKey: ["publicProfile", id] });
            }}
          />
          <ChangeBackgroundDialog
            open={changeBgOpen}
            onOpenChange={setChangeBgOpen}
            currentUrl={profile.coverImageUrl}
            onUpdated={(nextUrl) => {
              patchPublicCover(nextUrl);
              void queryClient.invalidateQueries({ queryKey: ["profile"] });
              void queryClient.invalidateQueries({ queryKey: ["publicProfile", id] });
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[3.5rem] text-center">
      <div className="text-base font-bold tabular-nums leading-none">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyTabCard({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground/80">
        <Camera className="h-6 w-6 text-foreground/80" />
      </div>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {action}
    </div>
  );
}
