import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
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
import {
  communityApi,
  userApi,
  type CommunityPost,
  type CommunityComment,
  type CommunityTagWithCount,
  type UserProfile,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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
    post.authorUserId === user?.id ? myName : post.authorDisplayName || "Member";
  const authorInitials =
    authorName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "M";
  const authorAvatar =
    post.authorUserId === user?.id ? myAvatar : post.authorPhotoUrl ?? undefined;
  const authorProfilePath =
    post.authorUserId === user?.id
      ? "/profile"
      : post.authorUserId
        ? `/user/${post.authorUserId}`
        : undefined;

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
      void refetchComments();
    } catch (err: unknown) {
      toast({
        title: "Could not add comment",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const mediaItems = post.media ?? [];
  const hasMedia = mediaItems.length > 0;
  const currentMedia = mediaItems[mediaPage];
  const imageOnlyMedia = mediaItems.filter((m) => m.type === "IMAGE");

  return (
    <article className="border-b border-border/50 bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {authorProfilePath ? (
          <Link to={authorProfilePath} className="shrink-0">
            <Avatar className="h-9 w-9 ring-1 ring-border/60">
              {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/60">
            {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {authorProfilePath ? (
              <Link to={authorProfilePath} className="truncate text-sm font-semibold hover:opacity-80">
                {authorName}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold">{authorName}</p>
            )}
            <span className="text-muted-foreground">·</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {post.createdAt ? timeAgo(post.createdAt) : ""}
            </span>
          </div>
          {post.location && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
              <span className="truncate">{post.location}</span>
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem className="rounded-lg" onClick={handleSave}>
              <Bookmark className={cn("mr-2 h-4 w-4", isSaved && "fill-current text-primary")} />
              {isSaved ? "Unsave" : "Save"}
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-destructive focus:text-destructive" onClick={onReport}>
              <Flag className="mr-2 h-4 w-4" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media first (IG style) */}
      {hasMedia && (
        <div className="relative bg-muted/30">
          {currentMedia.type === "IMAGE" ? (
            <button
              type="button"
              className="block w-full focus:outline-none"
              onDoubleClick={handleLike}
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
                style={{ maxHeight: 560, aspectRatio: mediaItems.length === 1 ? "4 / 5" : "1 / 1" }}
              />
            </button>
          ) : (
            <video
              src={currentMedia.url}
              controls
              className="w-full bg-black object-cover"
              style={{ maxHeight: 560 }}
            />
          )}

          {mediaItems.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
              {mediaItems.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "rounded-full transition-all",
                    i === mediaPage ? "h-1.5 w-4 bg-white" : "h-1.5 w-1.5 bg-white/55",
                  )}
                  onClick={() => setMediaPage(i)}
                  aria-label={`Go to media ${i + 1}`}
                />
              ))}
            </div>
          )}

          {mediaItems.length > 1 && (
            <>
              {mediaPage > 0 && (
                <button
                  type="button"
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                  onClick={() => setMediaPage((p) => p - 1)}
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                </button>
              )}
              {mediaPage < mediaItems.length - 1 && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
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

      {/* Actions */}
      <div className="px-2 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              type="button"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90",
                isLiked ? "text-red-500" : "text-foreground",
              )}
              onClick={handleLike}
              aria-label={isLiked ? "Unlike" : "Like"}
            >
              <Heart
                className={cn(
                  "h-[22px] w-[22px] transition-transform",
                  isLiked && "fill-current",
                  heartBurst && "scale-125",
                )}
              />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground"
              onClick={() => {
                setShowComments(true);
                setTimeout(() => commentInputRef.current?.focus(), 80);
              }}
              aria-label="Comment"
            >
              <MessageCircle className="h-[22px] w-[22px]" />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full text-foreground"
              onClick={onShare}
              aria-label="Share"
            >
              <Share2 className="h-[22px] w-[22px]" />
            </button>
          </div>
          <button
            type="button"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full",
              isSaved ? "text-primary" : "text-foreground",
            )}
            onClick={handleSave}
            aria-label={isSaved ? "Unsave" : "Save"}
          >
            <Bookmark className={cn("h-[22px] w-[22px]", isSaved && "fill-current")} />
          </button>
        </div>

        <div className="space-y-1 px-2 pb-3">
          {likes > 0 && (
            <p className="text-[13px] font-semibold">
              {likes.toLocaleString()} {likes === 1 ? "like" : "likes"}
            </p>
          )}

          {(post.content?.trim() || post.tags.length > 0 || post.emojiCodes.length > 0) && (
            <div className="text-[13px] leading-snug">
              {post.content?.trim() && (
                <p className="whitespace-pre-wrap">
                  <span className="font-semibold">{authorName}</span>{" "}
                  <span className="text-foreground/90">{post.content.trim()}</span>
                </p>
              )}
              {post.emojiCodes.length > 0 && (
                <p className="mt-0.5 text-base">{post.emojiCodes.join(" ")}</p>
              )}
              {post.tags.length > 0 && (
                <p className="mt-0.5 text-primary">
                  {post.tags.map((t) => `#${t.name}`).join(" ")}
                </p>
              )}
            </div>
          )}

          {commentCount > 0 && !showComments && (
            <button
              type="button"
              className="text-[13px] text-muted-foreground"
              onClick={() => setShowComments(true)}
            >
              View all {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </button>
          )}
        </div>
      </div>

      {showComments && (
        <div className="space-y-3 border-t border-border/40 px-3 py-3">
          {comments.length > 0 && (
            <div className="max-h-48 space-y-2.5 overflow-y-auto">
              {comments.map((c: CommunityComment) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-muted text-[10px] font-semibold">
                      {c.authorUserId === user?.id
                        ? myInitials
                        : String(c.authorUserId ?? "").slice(0, 2).toUpperCase() || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug">
                      <span className="font-semibold">
                        {c.authorUserId === user?.id ? myName : "Member"}
                      </span>{" "}
                      <span className="text-foreground/90">{c.content}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 shrink-0">
              {myAvatar && <AvatarImage src={myAvatar} alt={myName} />}
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {myInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5">
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
                className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              />
              <button
                type="button"
                className={cn(
                  "shrink-0",
                  commentText.trim() ? "text-primary" : "pointer-events-none text-muted-foreground/40",
                )}
                disabled={!commentText.trim() || isCommentSubmitting}
                onClick={() => void handleSubmitComment()}
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
    } catch (err: unknown) {
      toast({
        title: "Could not load posts",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadFeed({ reset: true });
    void communityApi
      .getTopTags(15)
      .then(setTopTags)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTagClick = (tag: CommunityTagWithCount) => {
    const next = selectedTag === tag.slug ? null : tag.slug;
    setSelectedTag(next);
    void loadFeed({ reset: true, tag: next });
  };

  const stories = useMemo(() => {
    const seen = new Set<string>();
    const items: { key: string; name: string; avatar?: string; path?: string }[] = [];
    for (const post of posts) {
      const key = post.authorUserId || post.authorDisplayName || String(post.id);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        key,
        name: post.authorUserId === user?.id ? meName : post.authorDisplayName || "Member",
        avatar:
          post.authorUserId === user?.id ? meAvatar : post.authorPhotoUrl ?? undefined,
        path:
          post.authorUserId === user?.id
            ? "/profile"
            : post.authorUserId
              ? `/user/${post.authorUserId}`
              : undefined,
      });
      if (items.length >= 12) break;
    }
    return items;
  }, [posts, user?.id, meName, meAvatar]);

  return (
    <AppLayout title="Community">
      <div className="mx-auto max-w-lg bg-background pb-2">
        {/* Composer chip */}
        <button
          type="button"
          onClick={() => setCreatePostOpen(true)}
          className="flex w-full items-center gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors hover:bg-muted/30"
        >
          <Avatar className="h-10 w-10 shrink-0">
            {meAvatar && <AvatarImage src={meAvatar} alt={meName} />}
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
              {meInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted-foreground">
              What&apos;s new, {meName.split(" ")[0]}?
            </p>
          </div>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary">
            <ImageIcon className="h-3.5 w-3.5" />
            Post
          </span>
        </button>

        {/* Stories strip */}
        <div className="flex gap-3 overflow-x-auto border-b border-border/50 px-3 py-3 scrollbar-hide">
            <button
              type="button"
              onClick={() => setCreatePostOpen(true)}
              className="flex w-16 shrink-0 flex-col items-center gap-1.5"
            >
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-border">
                  {meAvatar && <AvatarImage src={meAvatar} alt={meName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground">{meInitials}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                  <Plus className="h-3 w-3" />
                </span>
              </div>
              <span className="w-full truncate text-center text-[10px] font-medium">Your story</span>
            </button>
            {stories.map((s) => {
              const inner = (
                <>
                  <div className="rounded-full bg-gradient-to-tr from-primary via-secondary to-primary p-[2px]">
                    <Avatar className="h-14 w-14 border-2 border-background">
                      {s.avatar && <AvatarImage src={s.avatar} alt={s.name} />}
                      <AvatarFallback className="bg-muted text-xs font-semibold">
                        {s.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="w-full truncate text-center text-[10px] font-medium">
                    {s.name.split(" ")[0]}
                  </span>
                </>
              );
              return s.path ? (
                <Link key={s.key} to={s.path} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                  {inner}
                </Link>
              ) : (
                <div key={s.key} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                  {inner}
                </div>
              );
            })}
          </div>

        {/* Tags */}
        {topTags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-3 py-2.5 scrollbar-hide">
            <button
              type="button"
              onClick={() => {
                setSelectedTag(null);
                void loadFeed({ reset: true, tag: null });
              }}
              className={cn(
                "h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors",
                selectedTag == null
                  ? "bg-foreground text-background"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground",
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
                    "h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <EmptyFeed onCreatePost={() => setCreatePostOpen(true)} />
        ) : (
          <div>
            {posts.map((post) => (
              <div key={post.id} id={`post-${post.id}`}>
                <PostCard
                  post={post}
                  onLike={() =>
                    communityApi.toggleLike(post.id).then((u) => {
                      setPosts((prev) => prev.map((p) => (p.id === post.id ? u : p)));
                    })
                  }
                  onSave={() =>
                    communityApi.toggleSave(post.id).then((u) => {
                      setPosts((prev) => prev.map((p) => (p.id === post.id ? u : p)));
                    })
                  }
                  onShare={() => {
                    setSelectedPostId(post.id);
                    setShareDialogOpen(true);
                  }}
                  onReport={() => {
                    setSelectedPostId(post.id);
                    setReportDialogOpen(true);
                  }}
                />
              </div>
            ))}

            {hasMore && (
              <div className="px-4 py-5 text-center">
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => void loadFeed()}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
            try {
              await communityApi.trackShare(selectedPostId);
            } catch {
              /* ignore */
            }
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

function FeedSkeleton() {
  return (
    <div>
      {[0, 1].map((i) => (
        <div key={i} className="border-b border-border/50">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
              <div className="h-2.5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </div>
          <div className="aspect-[4/5] animate-pulse bg-muted" />
          <div className="space-y-2 px-4 py-3">
            <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ onCreatePost }: { onCreatePost: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground">
        <ImageIcon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-base font-semibold">Share your first moment</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Photos, updates, and community vibes — Instagram style.
        </p>
      </div>
      <Button className="gap-2 rounded-full" onClick={onCreatePost}>
        <Plus className="h-4 w-4" />
        Create post
      </Button>
    </div>
  );
}
