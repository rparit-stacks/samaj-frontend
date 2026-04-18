import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditProfileDialog } from "@/components/dialogs/EditProfileDialog";
import { RequestContactDialog } from "@/components/dialogs/RequestContactDialog";
import { ChangeBackgroundDialog } from "@/components/dialogs/ChangeBackgroundDialog";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useAuth } from "@/context/AuthContext";
import { userApi, eventsApi, communityApi, emergencyApi, chatApi } from "@/lib/api";
import type { CommunityPost, CommunityPostMedia, EmergencyItem, EventItem } from "@/lib/api";

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
    queryFn: () => communityApi.list({ authorId: profileUserId!, page: 0, size: 10 }),
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
    [postsData?.totalElements, posts.length, events.length, emergencies.length]
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

  if (isLoading || !id) {
    return (
      <AppLayout title="Profile">
        <div className="p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <p className="text-muted-foreground mt-4">Loading profile…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isError || !profile) {
    return (
      <AppLayout title="Profile">
        <div className="p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <p className="text-destructive mt-4">
              {error instanceof Error ? error.message : "Failed to load profile"}
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayName = profile.fullName || "Member";
  const initials = initialsOf(displayName);

  const handleKey = profile.profileKey ?? id;

  const openPost = (post: CommunityPost) => {
    const media = post.media ?? [];
    if (media.length === 0) return;
    setLightboxMedia(media);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  return (
    <AppLayout title={handleKey ?? displayName}>
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-3">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="truncate px-2 text-sm font-semibold">{handleKey}</div>
            <div className="flex items-center gap-1">
              {isOwner ? (
                <Button variant="ghost" size="icon" className="rounded-xl" asChild>
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl space-y-4 px-3 pb-6 pt-3">
          <Card className="overflow-hidden border border-border/70">
            <div
              className="relative h-28 bg-gradient-to-r from-primary/20 to-primary/5 bg-cover bg-center md:h-36"
              style={{ backgroundImage: profile.coverImageUrl ? `url(${profile.coverImageUrl})` : undefined }}
            >
              {isOwner && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-background/80"
                  onClick={() => setChangeBgOpen(true)}
                  aria-label="Change cover"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>
            <CardContent className="space-y-4 pb-4 pt-3">
              <div className="flex items-center gap-4">
                <div className="-mt-12 shrink-0 md:-mt-16">
                  <Avatar className="h-20 w-20 border-4 border-background shadow md:h-24 md:w-24">
                    <AvatarImage src={profile.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary text-xl text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="grid flex-1 grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold leading-none">{stats.posts}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Posts</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold leading-none">{stats.events}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Events</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold leading-none">{stats.sos}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">SOS</div>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold leading-tight">{displayName}</p>
                  {profile.bloodGroup && (
                    <Badge className="border-destructive/20 bg-destructive/10 text-destructive">{profile.bloodGroup}</Badge>
                  )}
                </div>
                {profile.bio && <p className="whitespace-pre-line text-sm text-foreground/90">{profile.bio}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {profile.profession && <span>{profile.profession}</span>}
                  {profile.city && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {profile.city}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {isOwner ? (
                    <>
                      <Button variant="outline" className="h-9 rounded-xl gap-2" onClick={() => setEditProfileOpen(true)}>
                        <Pencil className="h-4 w-4" />
                        Edit profile
                      </Button>
                      <Button variant="outline" className="h-9 rounded-xl gap-2" onClick={handleShare}>
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        className="h-9 rounded-xl gap-2"
                        disabled={chatLoading}
                        onClick={() => void startDirectChat()}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {chatLoading ? "…" : "Chat"}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 rounded-xl gap-2"
                        onClick={() => setContactRequestOpen(true)}
                      >
                        <UserPlus className="h-4 w-4" />
                        Request
                      </Button>
                    </>
                  )}
                </div>
                {!isOwner && (
                  <Button variant="outline" className="h-9 w-full rounded-xl gap-2" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    Share profile
                  </Button>
                )}
              </div>

              {(profile.phone || profile.email) && (
                <div className="flex flex-wrap gap-2">
                  {profile.phone && (
                    <Button asChild size="sm" className="h-8 rounded-xl gap-2">
                      <a href={`tel:${profile.phone}`}>
                        <Phone className="h-4 w-4" />
                        Call
                      </a>
                    </Button>
                  )}
                  {profile.email && (
                    <Button variant="outline" asChild size="sm" className="h-8 rounded-xl gap-2">
                      <a href={`mailto:${profile.email}`}>
                        <Mail className="h-4 w-4" />
                        Email
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/50">
              <TabsTrigger value="posts" className="gap-2 rounded-lg">
                <Grid3X3 className="h-4 w-4" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="events" className="gap-2 rounded-lg">
                <Calendar className="h-4 w-4" />
                Events
              </TabsTrigger>
              <TabsTrigger value="sos" className="gap-2 rounded-lg">
                <Siren className="h-4 w-4" />
                SOS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-3">
              {posts.length === 0 ? (
                <div className="rounded-xl border border-border/70 p-8 text-center text-sm text-muted-foreground">
                  No posts yet.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {posts.map((post) => {
                    const cover = postCover(post);
                    return (
                      <button
                        key={post.id}
                        type="button"
                        className="relative aspect-square overflow-hidden bg-muted/40 text-left"
                        onClick={() => openPost(post)}
                        aria-label="Open post"
                      >
                        {cover ? (
                          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-muted-foreground">
                            {post.content.slice(0, 40)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="events" className="mt-3">
              {!profile.showEventsOnProfile ? (
                <div className="rounded-xl border border-border/70 p-8 text-center text-sm text-muted-foreground">
                  Events hidden by profile settings.
                </div>
              ) : events.length === 0 ? (
                <div className="rounded-xl border border-border/70 p-8 text-center text-sm text-muted-foreground">
                  No events yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 15).map((ev) => (
                    <Link
                      key={ev.id}
                      to={`/events/${ev.id}`}
                      className="block rounded-xl border border-border/70 bg-card px-3 py-2.5"
                    >
                      <p className="truncate text-sm font-semibold">{ev.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{ev.date} • {ev.location}</p>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sos" className="mt-3">
              {!profile.showEmergenciesOnProfile ? (
                <div className="rounded-xl border border-border/70 p-8 text-center text-sm text-muted-foreground">
                  SOS posts hidden by profile settings.
                </div>
              ) : emergencies.length === 0 ? (
                <div className="rounded-xl border border-border/70 p-8 text-center text-sm text-muted-foreground">
                  No SOS posts.
                </div>
              ) : (
                <div className="space-y-2">
                  {emergencies.slice(0, 15).map((em) => (
                    <Link
                      key={em.id}
                      to={`/emergency/${em.id}`}
                      className="block rounded-xl border border-border/70 bg-card px-3 py-2.5"
                    >
                      <p className="truncate text-sm font-semibold">{em.title}</p>
                      <p className="truncate text-xs capitalize text-muted-foreground">
                        {em.status.toLowerCase().replace("_", " ")} • {em.city ?? "—"}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {!isOwner && (
            <div className="pb-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-2"
                onClick={() => {
                  toast({
                    title: "Report submitted",
                    description: "Thank you. We will review this profile.",
                  });
                }}
              >
                <Flag className="h-4 w-4" />
                Report
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
