import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Camera,
  Edit,
  Grid3X3,
  Share2,
  MoreHorizontal,
  Settings,
  LogOut,
  Plus,
  Users,
  Calendar,
  Siren,
  Shield,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { EditProfileDialog } from "@/components/dialogs/EditProfileDialog";
import { AddFamilyMemberDialog } from "@/components/dialogs/AddFamilyMemberDialog";
import { EditFamilyMemberDialog } from "@/components/dialogs/EditFamilyMemberDialog";
import { ChangeBackgroundDialog } from "@/components/dialogs/ChangeBackgroundDialog";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useAuth } from "@/context/AuthContext";
import {
  communityApi,
  emergencyApi,
  eventsApi,
  userApi,
  type CommunityPost,
  type CommunityPostMedia,
  type FamilyMember,
} from "@/lib/api";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [addFamilyOpen, setAddFamilyOpen] = useState(false);
  const [editFamilyOpen, setEditFamilyOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [changeBgOpen, setChangeBgOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: userApi.getProfile,
  });

  const { data: analytics } = useQuery({
    queryKey: ["community", "me", "analytics"],
    queryFn: communityApi.getMyAnalytics,
  });

  const name = profile?.fullName || user?.email?.split("@")[0] || "User";
  const username = useMemo(() => {
    const key = profile?.profileKey ?? user?.profileKey;
    if (key) return key;
    const base = user?.email?.split("@")[0] || "user";
    return base.replace(/[^a-zA-Z0-9._]/g, "");
  }, [profile?.profileKey, user?.profileKey, user?.email]);
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const profileUserId = profile?.userId ?? user?.id ?? "";

  const postsQuery = useInfiniteQuery({
    queryKey: ["community", "posts", "byAuthor", profileUserId],
    queryFn: ({ pageParam }) =>
      communityApi.list({ page: pageParam as number, size: 24, authorId: profileUserId || undefined }),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      if (last.totalPages <= 0) return undefined;
      if (last.number < last.totalPages - 1) return last.number + 1;
      return undefined;
    },
    enabled: !!profileUserId,
  });

  const posts: CommunityPost[] = useMemo(
    () => postsQuery.data?.pages.flatMap((p) => p.content) ?? [],
    [postsQuery.data?.pages]
  );

  const { data: family, isLoading: familyLoading } = useQuery({
    queryKey: ["family"],
    queryFn: userApi.getFamily,
  });

  const { data: myEvents, isLoading: myEventsLoading } = useQuery({
    queryKey: ["events", "mine", user?.id],
    queryFn: () => eventsApi.list({ organizerId: user?.id ?? undefined }),
    enabled: !!user?.id,
  });

  const { data: myEmergencies, isLoading: myEmergenciesLoading } = useQuery({
    queryKey: ["emergencies", "mine"],
    queryFn: emergencyApi.listMine,
  });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<CommunityPostMedia[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openPost = (post: CommunityPost) => {
    const media = post.media ?? [];
    if (media.length === 0) return;
    setLightboxMedia(media);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  const handleShareProfile = async () => {
    const key = profile?.profileKey ?? user?.profileKey;
    const path = key ? `/profile/${encodeURIComponent(key)}` : "/profile";
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Samaj Profile", url });
        return;
      }
    } catch {
      // ignore
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const ProfileMobileHeader = (
    <header className="sticky top-0 z-40 md:hidden">
      <div className="glass border-b border-border/70">
        <div className="h-16 px-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="tap-target rounded-2xl bg-muted/40 hover:bg-muted/70"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0 text-center flex-1 px-2">
            <p className="font-semibold truncate">{username}</p>
          </div>

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="tap-target rounded-2xl bg-muted/40 hover:bg-muted/70"
                aria-label="Menu"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="p-0 rounded-t-3xl">
              <SheetHeader className="px-5 pt-5 pb-3">
                <SheetTitle>Profile menu</SheetTitle>
              </SheetHeader>
              <div className="px-5 pb-5 space-y-3">
                <Button variant="outline" className="w-full justify-between rounded-2xl" asChild>
                  <Link to="/settings" onClick={() => setMenuOpen(false)}>
                    <span className="inline-flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Settings
                    </span>
                    <span className="text-muted-foreground text-xs">Manage</span>
                  </Link>
                </Button>

                <div className="rounded-2xl border border-border/70 bg-gradient-card p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">Theme</p>
                    <p className="text-xs text-muted-foreground">Light / Dark</p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    aria-label="Toggle theme"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full justify-between rounded-2xl text-destructive border-destructive/20 hover:bg-destructive/10"
                  onClick={async () => {
                    await logout();
                    setMenuOpen(false);
                    navigate("/login");
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Logout
                  </span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );

  return (
    <AppLayout title={username} mobileHeader={ProfileMobileHeader}>
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Profile top */}
        <div className="space-y-3">
          {/* Cover */}
          <div
            className="h-24 rounded-3xl overflow-hidden bg-gradient-primary relative bg-cover bg-center shadow-card"
            style={{ backgroundImage: profile?.coverImageUrl ? `url(${profile.coverImageUrl})` : undefined }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/30" />
            <Button
              size="icon-sm"
              variant="secondary"
              className="absolute bottom-3 right-3"
              onClick={() => setChangeBgOpen(true)}
              aria-label="Change cover"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <button
                type="button"
                className="rounded-full"
                onClick={() => setEditProfileOpen(true)}
                aria-label="Change profile photo"
              >
                <Avatar className="h-20 w-20 ring-2 ring-border shadow-card">
                  <AvatarImage src={profile?.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials}</AvatarFallback>
                </Avatar>
              </button>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-gradient-primary text-primary-foreground shadow-glow ring-2 ring-background flex items-center justify-center"
                onClick={() => setEditProfileOpen(true)}
                aria-label="Upload"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="rounded-2xl bg-gradient-card border border-border/70 shadow-card px-2 py-2 text-center"
                  onClick={() => {
                    // jump to Community tab
                    document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <div className="text-lg font-bold leading-none">{analytics?.totalPosts ?? 0}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Community</div>
                </button>
                <button
                  type="button"
                  className="rounded-2xl bg-gradient-card border border-border/70 shadow-card px-2 py-2 text-center"
                  onClick={() => {
                    document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <div className="text-lg font-bold leading-none">{myEvents?.length ?? 0}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Events</div>
                </button>
                <button
                  type="button"
                  className="rounded-2xl bg-gradient-card border border-border/70 shadow-card px-2 py-2 text-center"
                  onClick={() => {
                    document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <div className="text-lg font-bold leading-none">{myEmergencies?.length ?? 0}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">SOS</div>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-semibold leading-tight">{name}</p>
            {profile?.bio ? (
              <p className="text-sm text-foreground/90 whitespace-pre-line line-clamp-3">{profile.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Add a bio to tell people about you.</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {profile?.profession && <span>{profile.profession}</span>}
              {profile?.city && (
                <>
                  <span>•</span>
                  <span>{profile.city}</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="rounded-2xl shadow-card hover:shadow-card-hover transition-shadow gap-2"
              onClick={() => setEditProfileOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              className="rounded-2xl shadow-glow gap-2 shine-active"
              onClick={handleShareProfile}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          {/* Highlights */}
          <div className="pt-2">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              <button
                type="button"
                className="flex flex-col items-center gap-2 flex-shrink-0"
                onClick={() => navigate("/documents/my")}
              >
                <div className="h-14 w-14 rounded-full border border-border/70 bg-gradient-card shadow-card flex items-center justify-center">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground">Add</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-2 flex-shrink-0"
                onClick={() => navigate("/directory")}
              >
                <div className="h-14 w-14 rounded-full border border-border/70 bg-gradient-card shadow-card flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground">Directory</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-2 flex-shrink-0"
                onClick={() => navigate("/events")}
              >
                <div className="h-14 w-14 rounded-full border border-border/70 bg-gradient-card shadow-card flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground">Events</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-2 flex-shrink-0"
                onClick={() => navigate("/emergency")}
              >
                <div className="h-14 w-14 rounded-full border border-border/70 bg-gradient-card shadow-card flex items-center justify-center">
                  <Siren className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground">Emergency</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center gap-2 flex-shrink-0"
                onClick={() => navigate("/settings#privacy")}
              >
                <div className="h-14 w-14 rounded-full border border-border/70 bg-gradient-card shadow-card flex items-center justify-center">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <span className="text-[11px] text-muted-foreground">Privacy</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content tabs */}
        <Tabs defaultValue="community" className="w-full" id="profile-tabs">
          <TabsList className="w-full rounded-2xl bg-muted/40">
            <TabsTrigger value="community" className="flex-1 rounded-xl gap-2">
              <Grid3X3 className="h-4 w-4" /> Community
            </TabsTrigger>
            <TabsTrigger value="family" className="flex-1 rounded-xl gap-2">
              <Users className="h-4 w-4" /> Family
            </TabsTrigger>
            <TabsTrigger value="events" className="flex-1 rounded-xl gap-2">
              <Calendar className="h-4 w-4" /> Events
            </TabsTrigger>
            <TabsTrigger value="emergency" className="flex-1 rounded-xl gap-2">
              <Siren className="h-4 w-4" /> SOS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="community">
            {postsQuery.isLoading ? (
              <div className="grid grid-cols-3 gap-1 mt-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-border/70 bg-gradient-card p-6 text-center">
                <p className="font-semibold">No community posts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your community posts will appear here.
                </p>
                <Button className="mt-4" variant="outline" asChild>
                  <Link to="/feeds">Go to Community</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1 mt-3">
                  {posts.map((p) => {
                    const cover = (p.media ?? []).find((m) => m.type === "IMAGE")?.url ?? (p.media ?? [])[0]?.url;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="aspect-square bg-muted/40 relative"
                        onClick={() => openPost(p)}
                        aria-label="Open post"
                      >
                        {cover ? (
                          <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-2 text-center">
                            {p.content.slice(0, 40)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {postsQuery.hasNextPage && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      className="w-full rounded-2xl"
                      disabled={postsQuery.isFetchingNextPage}
                      onClick={() => postsQuery.fetchNextPage()}
                    >
                      {postsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="family">
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">Family members</p>
                <p className="text-xs text-muted-foreground">Add and manage your family list</p>
              </div>
              <Button
                className="rounded-2xl shadow-card gap-2 shrink-0"
                onClick={() => setAddFamilyOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {familyLoading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : (family ?? []).length === 0 ? (
              <div className="mt-6 rounded-3xl border border-border/70 bg-gradient-card p-6 text-center">
                <p className="font-semibold">No family members added</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your family to make your profile more complete.
                </p>
                <Button className="mt-4 rounded-2xl gap-2" onClick={() => setAddFamilyOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add family member
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {(family as FamilyMember[]).map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-border/70 bg-gradient-card shadow-card px-4 py-3 flex items-center gap-3"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {m.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.relation}
                        {m.city ? ` • ${m.city}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-2xl"
                      onClick={() => {
                        setEditingMember(m);
                        setEditFamilyOpen(true);
                      }}
                      aria-label="Edit family member"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events">
            {myEventsLoading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl" />
                ))}
              </div>
            ) : (myEvents ?? []).length === 0 ? (
              <div className="mt-6 rounded-3xl border border-border/70 bg-gradient-card p-6 text-center">
                <p className="font-semibold">No events created</p>
                <p className="text-sm text-muted-foreground mt-1">
                  When you create events, they’ll show up here.
                </p>
                <Button className="mt-4" variant="outline" asChild>
                  <Link to="/events">Browse events</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {(myEvents ?? []).slice(0, 10).map((e) => (
                  <Link
                    key={e.id}
                    to={`/events/${e.id}`}
                    className="block rounded-2xl border border-border/70 bg-gradient-card shadow-card px-4 py-3"
                  >
                    <p className="font-semibold text-sm truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.location}</p>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="emergency">
            {myEmergenciesLoading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl" />
                ))}
              </div>
            ) : (myEmergencies ?? []).length === 0 ? (
              <div className="mt-6 rounded-3xl border border-border/70 bg-gradient-card p-6 text-center">
                <p className="font-semibold">No emergency posts</p>
                <p className="text-sm text-muted-foreground mt-1">
                  If you ever create an SOS/emergency, it will appear here.
                </p>
                <Button className="mt-4" variant="outline" asChild>
                  <Link to="/emergency">Open Emergency</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {(myEmergencies ?? []).slice(0, 10).map((em) => (
                  <Link
                    key={em.id}
                    to={`/emergency/${em.id}`}
                    className="block rounded-2xl border border-border/70 bg-gradient-card shadow-card px-4 py-3"
                  >
                    <p className="font-semibold text-sm truncate">{em.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{em.location}</p>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EditProfileDialog
        open={editProfileOpen}
        onOpenChange={setEditProfileOpen}
        profile={profile}
        user={user}
        onProfileUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }}
      />
      <AddFamilyMemberDialog
        open={addFamilyOpen}
        onOpenChange={setAddFamilyOpen}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ["family"] })}
      />
      <EditFamilyMemberDialog
        open={editFamilyOpen}
        onOpenChange={(o) => {
          setEditFamilyOpen(o);
          if (!o) setEditingMember(null);
        }}
        member={editingMember}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["family"] })}
      />
      <ChangeBackgroundDialog
        open={changeBgOpen}
        onOpenChange={setChangeBgOpen}
        currentUrl={profile?.coverImageUrl}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ["profile"] })}
      />

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        media={lightboxMedia.map((m) => ({ id: m.id, url: m.url, type: m.type }))}
        initialIndex={lightboxIndex}
      />
    </AppLayout>
  );
}
