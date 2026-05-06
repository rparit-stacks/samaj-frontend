import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Image as ImageIcon,
  Send,
  Flag,
  Bookmark,
  Plus,
  MapPin,
  Smile,
  Tag,
  ChevronDown,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatePostDialog } from "@/components/dialogs/CreatePostDialog";
import { ShareDialog } from "@/components/dialogs/ShareDialog";
import { ReportContentDialog } from "@/components/dialogs/ReportContentDialog";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  communityApi,
  userApi,
  type CommunityPost,
  type CommunityComment,
  type CommunityTagWithCount,
  type CommunityAnalytics,
  type UserProfile,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── PostCard ───────────────────────────────────────────────────────────────────

function PostCard({
  post,
  onLike,
  onSave,
  onShare,
  onReport,
}: {
  post: CommunityPost;
  onLike: () => Promise<void>;
  onSave: () => Promise<void>;
  onShare: () => void;
  onReport: () => void;
}) {
  const [isLiked, setIsLiked] = useState(post.likedByCurrentUser);
  const [likes, setLikes] = useState(post.likeCount);
  const [isSaved, setIsSaved] = useState(post.savedByCurrentUser);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mediaPage, setMediaPage] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const commentInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: userApi.getProfile,
    enabled: !!user,
  });

  const myName =
    profile?.fullName ||
    (user?.metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "You";
  const myInitials =
    myName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const myAvatar = profile?.avatarUrl ?? undefined;

  const authorName =
    post.authorUserId === user?.id
      ? myName
      : post.authorDisplayName || "Member";
  const authorInitials =
    authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "M";
  const authorAvatar =
    post.authorUserId === user?.id ? myAvatar : post.authorPhotoUrl ?? undefined;

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ["post-comments", post.id],
    queryFn: () => communityApi.listComments(post.id, { page: 0, size: 50 }),
    enabled: showComments,
  });
  const comments = commentsData?.content ?? [];

  const handleLike = () => {
    const prev = isLiked;
    const prevLikes = likes;
    setIsLiked(!prev);
    setLikes(!prev ? prevLikes + 1 : Math.max(0, prevLikes - 1));
    if (!prev) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 600);
    }
    void onLike().catch(() => {
      setIsLiked(prev);
      setLikes(prevLikes);
      toast({ title: "Could not update like", variant: "destructive" });
    });
  };

  const handleSave = () => {
    const prev = isSaved;
    setIsSaved(!prev);
    toast({ title: !prev ? "Saved" : "Removed from saved" });
    void onSave().catch(() => {
      setIsSaved(prev);
      toast({ title: "Could not update", variant: "destructive" });
    });
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || isCommentSubmitting) return;
    setIsCommentSubmitting(true);
    try {
      await communityApi.addComment(post.id, { content: text });
      setCommentText("");
      setCommentCount((c) => c + 1);
      refetchComments();
    } catch (err: any) {
      toast({ title: "Could not add comment", description: err?.message, variant: "destructive" });
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const mediaItems = post.media ?? [];
  const hasMedia = mediaItems.length > 0;
  const currentMedia = mediaItems[mediaPage];
  const imageOnlyMedia = mediaItems.filter((m) => m.type === "IMAGE");

  return (
    <article className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-sm">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar className="h-10 w-10 ring-2 ring-border shrink-0">
          {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {authorInitials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{authorName}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            {post.location && (
              <>
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[120px]">{post.location}</span>
                <span>·</span>
              </>
            )}
            <span>{post.createdAt ? timeAgo(post.createdAt) : "Samaj"}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem className="rounded-lg" onClick={handleSave}>
              <Bookmark className={cn("h-4 w-4 mr-2", isSaved && "fill-current text-primary")} />
              {isSaved ? "Remove from saved" : "Save post"}
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg" onClick={onShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share post
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-destructive focus:text-destructive" onClick={onReport}>
              <Flag className="h-4 w-4 mr-2" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Text content ───────────────────────────────────────────────────── */}
      {(post.content || post.tags.length > 0 || post.emojiCodes.length > 0) && (
        <div className="px-4 pb-3 space-y-2">
          {post.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {post.content}
            </p>
          )}
          {post.emojiCodes.length > 0 && (
            <div className="flex flex-wrap gap-1 text-lg">
              {post.emojiCodes.map((code, idx) => (
                <span key={`${code}-${idx}`}>{code}</span>
              ))}
            </div>
          )}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-[12px] font-medium text-primary hover:underline cursor-pointer"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Media ──────────────────────────────────────────────────────────── */}
      {hasMedia && (
        <div className="relative bg-black">
          {currentMedia.type === "IMAGE" ? (
            <button
              type="button"
              className="w-full block focus:outline-none"
              onClick={() => {
                const imgIdx = imageOnlyMedia.findIndex((m) => m.id === currentMedia.id);
                setLightboxIndex(Math.max(0, imgIdx));
                setLightboxOpen(true);
              }}
            >
              <img
                src={currentMedia.url}
                alt=""
                className="w-full object-cover"
                style={{ maxHeight: 480, minHeight: 200 }}
              />
            </button>
          ) : (
            <video
              src={currentMedia.url}
              controls
              className="w-full object-cover bg-black"
              style={{ maxHeight: 480, minHeight: 200 }}
            />
          )}

          {/* Multi-image navigation dots */}
          {mediaItems.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
              {mediaItems.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "rounded-full transition-all",
                    i === mediaPage
                      ? "bg-white w-5 h-1.5"
                      : "bg-white/50 w-1.5 h-1.5 hover:bg-white/80",
                  )}
                  onClick={() => setMediaPage(i)}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Left / Right swipe arrows for multi-image */}
          {mediaItems.length > 1 && (
            <>
              {mediaPage > 0 && (
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  onClick={() => setMediaPage((p) => p - 1)}
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
              )}
              {mediaPage < mediaItems.length - 1 && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                  onClick={() => setMediaPage((p) => p + 1)}
                >
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        media={imageOnlyMedia}
        initialIndex={lightboxIndex}
      />

      {/* ── Actions ────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {/* Like */}
            <button
              type="button"
              className={cn(
                "h-10 w-10 flex items-center justify-center rounded-xl transition-all active:scale-90",
                isLiked ? "text-red-500" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={handleLike}
              aria-label={isLiked ? "Unlike" : "Like"}
            >
              <Heart
                className={cn(
                  "h-6 w-6 transition-all duration-200",
                  isLiked && "fill-current",
                  heartBurst && "scale-125",
                )}
              />
            </button>

            {/* Comment */}
            <button
              type="button"
              className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                setShowComments(true);
                setTimeout(() => commentInputRef.current?.focus(), 100);
              }}
              aria-label="Comment"
            >
              <MessageCircle className="h-6 w-6" />
            </button>

            {/* Share */}
            <button
              type="button"
              className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              onClick={onShare}
              aria-label="Share"
            >
              <Share2 className="h-6 w-6" />
            </button>
          </div>

          {/* Bookmark */}
          <button
            type="button"
            className={cn(
              "h-10 w-10 flex items-center justify-center rounded-xl transition-colors",
              isSaved ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={handleSave}
            aria-label={isSaved ? "Remove from saved" : "Save"}
          >
            <Bookmark className={cn("h-6 w-6 transition-all", isSaved && "fill-current")} />
          </button>
        </div>

        {/* Like / comment counts */}
        <div className="px-1 pb-1 text-[13px]">
          {likes > 0 && (
            <p className="font-semibold">
              {likes.toLocaleString()} {likes === 1 ? "like" : "likes"}
            </p>
          )}
          {commentCount > 0 && !showComments && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              onClick={() => setShowComments(true)}
            >
              View all {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      </div>

      {/* ── Comments ───────────────────────────────────────────────────────── */}
      {showComments && (
        <div className="px-4 pb-3 space-y-3 border-t border-border/50 pt-3">
          {comments.length > 0 && (
            <div className="space-y-2.5 max-h-52 overflow-y-auto">
              {comments.map((c: CommunityComment) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted font-semibold">
                      {c.authorUserId === user?.id
                        ? myInitials
                        : String(c.authorUserId ?? "").slice(0, 2).toUpperCase() || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 bg-muted/50 rounded-2xl rounded-tl-sm px-3 py-2">
                    <p className="text-[11px] font-semibold text-foreground/70 leading-none mb-1">
                      {c.authorUserId === user?.id ? myName : "Member"}
                    </p>
                    <p className="text-sm break-words leading-snug">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              {myAvatar && <AvatarImage src={myAvatar} alt={myName} />}
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {myInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-2xl px-3 py-1.5">
              <Input
                ref={commentInputRef}
                placeholder="Add a comment…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmitComment();
                  }
                }}
                className="border-0 bg-transparent h-7 p-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                className={cn(
                  "shrink-0 transition-colors",
                  commentText.trim()
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground/40 pointer-events-none",
                )}
                disabled={!commentText.trim() || isCommentSubmitting}
                onClick={handleSubmitComment}
                aria-label="Post comment"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// ── Feeds page ─────────────────────────────────────────────────────────────────

export default function Feeds() {
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [topTags, setTopTags] = useState<CommunityTagWithCount[]>([]);
  const [analytics, setAnalytics] = useState<CommunityAnalytics | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: userApi.getProfile,
    enabled: !!user,
  });

  const meName =
    profile?.fullName ||
    (user?.metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "You";
  const meInitials =
    meName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const meAvatar = profile?.avatarUrl ?? undefined;

  const loadFeed = async (opts?: { reset?: boolean; tag?: string | null }) => {
    const reset = opts?.reset ?? false;
    const tag = opts?.tag !== undefined ? opts.tag : selectedTag;
    try {
      if (reset) {
        setIsLoading(true);
        setPage(0);
      } else {
        setIsLoadingMore(true);
      }
      const res = await communityApi.list({ page: reset ? 0 : page, size: 10, tag: tag || undefined });
      setHasMore(res.number + 1 < res.totalPages);
      setPosts((prev) => (reset ? res.content : [...prev, ...res.content]));
      setPage(res.number + 1);
    } catch (err: any) {
      toast({ title: "Could not load posts", description: err?.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadSidebarData = async () => {
    try {
      const [tags, stats] = await Promise.all([
        communityApi.getTopTags(15),
        communityApi.getMyAnalytics(),
      ]);
      setTopTags(tags);
      setAnalytics(stats);
    } catch { /* non-blocking */ }
  };

  useEffect(() => {
    void loadFeed({ reset: true });
    void loadSidebarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedPosts = useMemo(
    () => posts.filter((p) => p.savedByCurrentUser).slice(0, 5),
    [posts],
  );

  const handleTagClick = (tag: CommunityTagWithCount) => {
    const next = selectedTag === tag.slug ? null : tag.slug;
    setSelectedTag(next);
    void loadFeed({ reset: true, tag: next });
  };

  return (
    <AppLayout title="Community">
      <div className="md:px-6 md:py-6 px-0 py-0">
        <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-0 lg:gap-6">

          {/* ── Main feed column ─────────────────────────────────────────── */}
          <div className="min-w-0">

            {/* Page header — desktop only */}
            <div className="hidden md:flex items-center justify-between mb-5">
              <div>
                <h1 className="text-2xl font-bold">Community</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  See what your community is sharing
                </p>
              </div>
              <Button className="gap-2 rounded-xl" onClick={() => setCreatePostOpen(true)}>
                <Plus className="h-4 w-4" />
                New Post
              </Button>
            </div>

            {/* ── Create post bar ──────────────────────────────────────────── */}
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3 cursor-pointer",
                "bg-card border-b border-border/60 md:rounded-2xl md:border md:border-border/60 md:mb-4 md:shadow-sm",
                "hover:bg-muted/30 transition-colors",
              )}
              onClick={() => setCreatePostOpen(true)}
            >
              <Avatar className="h-10 w-10 shrink-0">
                {meAvatar && <AvatarImage src={meAvatar} alt={meName} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {meInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 bg-muted/60 rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
                What's on your mind, {meName.split(" ")[0]}?
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-xl h-9 w-9 shrink-0"
                onClick={(e) => { e.stopPropagation(); setCreatePostOpen(true); }}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {/* Quick action row */}
            <div
              className={cn(
                "flex items-center gap-0 border-b border-border/60 bg-card",
                "md:hidden",
              )}
            >
              {[
                { icon: <ImageIcon className="h-4 w-4 text-green-600" />, label: "Photo" },
                { icon: <Tag className="h-4 w-4 text-blue-500" />, label: "Tag" },
                { icon: <MapPin className="h-4 w-4 text-red-500" />, label: "Location" },
                { icon: <Smile className="h-4 w-4 text-amber-500" />, label: "Feeling" },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  type="button"
                  className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                  onClick={() => setCreatePostOpen(true)}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tag filter bar ────────────────────────────────────────────── */}
            {topTags.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-3 md:px-0 md:mb-2">
                <button
                  type="button"
                  onClick={() => { setSelectedTag(null); void loadFeed({ reset: true, tag: null }); }}
                  className={cn(
                    "flex-shrink-0 h-8 px-4 rounded-full text-xs font-semibold transition-all border",
                    selectedTag == null
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  For you
                </button>
                {topTags.slice(0, 12).map((tag) => {
                  const active = selectedTag === tag.slug;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      className={cn(
                        "flex-shrink-0 h-8 px-4 rounded-full text-xs font-semibold transition-all border",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Posts ─────────────────────────────────────────────────────── */}
            {isLoading ? (
              <PostsFeedSkeleton />
            ) : posts.length === 0 ? (
              <EmptyFeed onCreatePost={() => setCreatePostOpen(true)} />
            ) : (
              <div className="space-y-3 px-3 md:px-0 pb-6 pt-1">
                {posts.map((post) => (
                  <div key={post.id} id={`post-${post.id}`}>
                    <PostCard
                      post={post}
                      onLike={() => communityApi.toggleLike(post.id).then((u) => {
                        setPosts((prev) => prev.map((p) => (p.id === post.id ? u : p)));
                      })}
                      onSave={() => communityApi.toggleSave(post.id).then((u) => {
                        setPosts((prev) => prev.map((p) => (p.id === post.id ? u : p)));
                      })}
                      onShare={() => { setSelectedPostId(post.id); setShareDialogOpen(true); }}
                      onReport={() => { setSelectedPostId(post.id); setReportDialogOpen(true); }}
                    />
                  </div>
                ))}

                {hasMore && (
                  <div className="text-center pt-2">
                    <Button
                      variant="outline"
                      className="rounded-xl w-full md:w-auto"
                      onClick={() => void loadFeed()}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? "Loading…" : "Load more posts"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right sidebar ────────────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <div className="space-y-4 sticky top-20">

              {/* Trending tags */}
              <div className="bg-card rounded-2xl border border-border/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm">Trending</h2>
                  {selectedTag && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => { setSelectedTag(null); void loadFeed({ reset: true, tag: null }); }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                {topTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tags yet.</p>
                ) : (
                  <ScrollArea className="h-36">
                    <div className="flex flex-wrap gap-1.5 pr-2">
                      {topTags.map((tag) => {
                        const active = selectedTag === tag.slug;
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleTagClick(tag)}
                            className={cn(
                              "h-7 px-3 rounded-full text-xs font-medium border transition-all",
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
                            )}
                          >
                            #{tag.name}
                            <span className="ml-1 opacity-60">{tag.postCount}</span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Saved posts */}
              {savedPosts.length > 0 && (
                <div className="bg-card rounded-2xl border border-border/60 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-sm">Saved</h2>
                    <Badge variant="secondary" className="text-[10px] rounded-full">
                      {savedPosts.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {savedPosts.map((post) => (
                      <button
                        key={post.id}
                        type="button"
                        className="w-full text-left text-xs rounded-xl px-3 py-2 bg-muted/40 hover:bg-muted transition-colors"
                        onClick={() => {
                          document.getElementById(`post-${post.id}`)
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <p className="line-clamp-2 text-foreground/80">{post.content}</p>
                        {post.tags.length > 0 && (
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {post.tags.slice(0, 2).map((t) => `#${t.name}`).join(" ")}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Analytics */}
              <div className="bg-card rounded-2xl border border-border/60 p-4">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Your impact
                </h2>
                {analytics ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Posts", value: analytics.totalPosts },
                      { label: "Likes got", value: analytics.totalLikesReceived },
                      { label: "Likes given", value: analytics.totalLikesGiven },
                      { label: "Saved", value: analytics.totalSaves },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl bg-muted/50 px-3 py-2.5 text-center">
                        <p className="text-lg font-bold leading-none">{value}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Start posting to see your stats.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onCreated={(post) => setPosts((prev) => [post, ...prev])}
      />
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title="Check out this post!"
        url={`${window.location.origin}/posts/${selectedPostId ?? ""}`}
        onCopy={async () => {
          if (selectedPostId != null) {
            try { await communityApi.trackShare(selectedPostId); } catch { /* ignore */ }
          }
        }}
      />
      <ReportContentDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        contentType="post"
        postId={selectedPostId}
      />
    </AppLayout>
  );
}

// ── Skeletons & empty states ───────────────────────────────────────────────────

function PostsFeedSkeleton() {
  return (
    <div className="space-y-3 px-3 md:px-0 pt-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
              <div className="h-2.5 w-20 rounded-full bg-muted animate-pulse" />
            </div>
          </div>
          <div className="px-4 pb-3 space-y-2">
            <div className="h-3 w-full rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-4/5 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-48 bg-muted animate-pulse" />
          <div className="px-4 py-3 flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ onCreatePost }: { onCreatePost: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-semibold text-base">Nothing here yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Be the first to share something with your community.
        </p>
      </div>
      <Button className="rounded-xl gap-2 mt-1" onClick={onCreatePost}>
        <Plus className="h-4 w-4" />
        Create first post
      </Button>
    </div>
  );
}
