import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Image,
  Send,
  Flag,
  Bookmark,
  Plus,
  MapPin,
  Smile,
  Tag,
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
import { PostCardSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyPosts } from "@/components/ui/empty-state";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: userApi.getProfile,
    enabled: !!user,
  });
  const commentName =
    profile?.fullName ||
    (user?.metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "You";
  const commentInitials =
    commentName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const commentAvatar = profile?.avatarUrl ?? undefined;

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ["post-comments", post.id],
    queryFn: () => communityApi.listComments(post.id, { page: 0, size: 50 }),
    enabled: showComments,
  });
  const comments = commentsData?.content ?? [];

  const handleLike = () => {
    const prevLiked = isLiked;
    const prevLikes = likes;
    const nextLiked = !prevLiked;
    setIsLiked(nextLiked);
    setLikes(nextLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1));

    void onLike().catch(() => {
      setIsLiked(prevLiked);
      setLikes(prevLikes);
      toast({
        title: "Could not update like",
        description: "Please try again.",
        variant: "destructive",
      });
    });
  };

  const handleSave = () => {
    const prevSaved = isSaved;
    const nextSaved = !prevSaved;
    setIsSaved(nextSaved);
    toast({
      title: nextSaved ? "Post saved" : "Removed from saved",
      description: nextSaved
        ? "Post added to your saved items"
        : "Post removed from your saved items",
    });

    void onSave().catch(() => {
      setIsSaved(prevSaved);
      toast({
        title: "Could not update saved state",
        description: "Please try again.",
        variant: "destructive",
      });
    });
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || isCommentSubmitting) return;
    setIsCommentSubmitting(true);
    // #region agent log
    fetch("http://127.0.0.1:7243/ingest/f672d058-8519-4384-812f-146c3e010c03", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "Feeds.tsx:handleSubmitComment",
        message: "Comment submit attempt",
        data: { postId: post.id, textLength: text.length },
        timestamp: Date.now(),
        hypothesisId: "comment-api",
      }),
    }).catch(() => {});
    // #endregion
    try {
      const res = await communityApi.addComment(post.id, { content: text });
      // #region agent log
      fetch("http://127.0.0.1:7243/ingest/f672d058-8519-4384-812f-146c3e010c03", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "Feeds.tsx:handleSubmitComment",
          message: "Comment submit success",
          data: { postId: post.id, commentId: (res as { id?: number })?.id },
          timestamp: Date.now(),
          hypothesisId: "comment-api",
        }),
      }).catch(() => {});
      // #endregion
      setCommentText("");
      setCommentCount((c) => c + 1);
      refetchComments();
    } catch (err: any) {
      // #region agent log
      fetch("http://127.0.0.1:7243/ingest/f672d058-8519-4384-812f-146c3e010c03", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "Feeds.tsx:handleSubmitComment",
          message: "Comment submit error",
          data: { postId: post.id, error: String(err?.message ?? err) },
          timestamp: Date.now(),
          hypothesisId: "comment-api",
        }),
      }).catch(() => {});
      // #endregion
      toast({
        title: "Could not add comment",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  return (
    <div className={cn(
      // Mobile: Instagram-like full-bleed post
      "bg-background rounded-none shadow-none border-b border-border/70",
      // Desktop: keep card look
      "md:bg-card md:rounded-2xl md:shadow-card md:overflow-hidden md:border md:border-border/60"
    )}>
      {/* Post Header */}
      <div className="flex items-center justify-between px-3 py-3 md:p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 md:h-10 md:w-10">
            {post.authorUserId === user?.id ? (
              commentAvatar ? (
                <AvatarImage src={commentAvatar} alt={commentName} />
              ) : null
            ) : post.authorPhotoUrl ? (
              <AvatarImage src={post.authorPhotoUrl} alt={post.authorDisplayName ?? "Member"} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              {post.authorUserId === user?.id
                ? commentInitials
                : (post.authorDisplayName || "Member")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "M"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">
              {post.authorUserId === user?.id
                ? (commentName || post.authorDisplayName || "You")
                : (post.authorDisplayName || "Member")}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {post.location != null && post.location !== "" && (
                <>
                  <MapPin className="h-3 w-3" />
                  <span>{post.location}</span>
                  <span>•</span>
                </>
              )}
              <span>Samaj Community</span>
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSave}>
              <Bookmark className={cn("h-4 w-4 mr-2", isSaved && "fill-current")} />
              {isSaved ? "Unsave" : "Save Post"}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onReport}>
              <Flag className="h-4 w-4 mr-2" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Content */}
      <div className="px-3 pb-3 md:px-4 space-y-3">
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-xs rounded-full"
              >
                #{tag.name}
              </Badge>
            ))}
          </div>
        )}

        {post.emojiCodes.length > 0 && (
          <div className="flex flex-wrap gap-1 text-xl">
            {post.emojiCodes.map((code, idx) => (
              <span key={`${code}-${idx}`}>{code}</span>
            ))}
          </div>
        )}
      </div>

      {/* Post Media: swipeable on mobile, grid on desktop */}
      {post.media && post.media.length > 0 && (
        <div
          className={cn(
            "relative",
            "overflow-x-auto flex gap-1 scroll-smooth snap-x snap-mandatory",
            "md:grid md:overflow-visible md:snap-none",
            post.media.length === 1 ? "md:grid-cols-1" : "md:grid-cols-2"
          )}
        >
          {post.media.map((media, index) => {
            const imageIndex = post.media
              .slice(0, index)
              .filter((m) => m.type === "IMAGE").length;
            return (
            <div
              key={media.id ?? index}
              className="snap-center min-w-full md:min-w-0"
            >
              {media.type === "IMAGE" ? (
                <button
                  type="button"
                  className="w-full h-60 md:h-72 block cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
                  onClick={() => {
                    setLightboxIndex(imageIndex);
                    setLightboxOpen(true);
                  }}
                >
                  <img
                    src={media.url}
                    alt=""
                    className="w-full h-full object-cover rounded-none md:rounded-b-2xl"
                  />
                </button>
              ) : (
                <video
                  src={media.url}
                  controls
                  className="w-full h-60 md:h-72 object-cover rounded-none md:rounded-b-2xl bg-black"
                />
              )}
            </div>
          );
          })}
        </div>
      )}

      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        media={post.media}
        initialIndex={lightboxIndex}
      />

      {/* Post Actions */}
      <div className="px-3 py-3 md:p-4 border-t border-border/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("rounded-2xl", isLiked && "text-red-500")}
              onClick={handleLike}
              aria-label={isLiked ? "Unlike" : "Like"}
            >
              <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl"
              onClick={() => setShowComments(!showComments)}
              aria-label="Comments"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-2xl"
              onClick={onShare}
              aria-label="Share"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl"
            onClick={handleSave}
            aria-label={isSaved ? "Unsave" : "Save"}
          >
            <Bookmark className={cn("h-5 w-5", isSaved && "fill-current text-primary")} />
          </Button>
        </div>

        {/* Counts (Instagram-like) */}
        <div className="mt-1.5 text-[12px] text-foreground">
          <span className="font-semibold">{likes}</span>{" "}
          <span className="text-muted-foreground">likes</span>
          {commentCount > 0 && (
            <span className="ml-3">
              <span className="font-semibold">{commentCount}</span>{" "}
              <span className="text-muted-foreground">comments</span>
            </span>
          )}
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-4 space-y-4">
            {comments.length > 0 && (
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {comments.map((c: CommunityComment) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {String(c.authorUserId).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {c.authorUserId === user?.id ? commentName : "Member"}
                      </p>
                      <p className="text-sm break-words">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
            <Avatar className="h-8 w-8">
              {commentAvatar && (
                <AvatarImage src={commentAvatar} alt={commentName} />
              )}
              <AvatarFallback>{commentInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                className="min-h-[40px] resize-none"
                rows={1}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button
                size="icon"
                disabled={!commentText.trim() || isCommentSubmitting}
                onClick={handleSubmitComment}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
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
    "User";
  const meInitials =
    meName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const meAvatar = profile?.avatarUrl ?? undefined;
  const [location, setLocation] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tagsForNewPost, setTagsForNewPost] = useState<string[]>([]);
  const [emojiInput, setEmojiInput] = useState("");

  const loadFeed = async (opts?: { reset?: boolean; tag?: string | null }) => {
    const reset = opts?.reset ?? false;
    const tag = opts?.tag ?? selectedTag;
    try {
      if (reset) {
        setIsLoading(true);
        setPage(0);
      } else {
        setIsLoadingMore(true);
      }
      const res = await communityApi.list({
        page: reset ? 0 : page,
        size: 10,
        tag: tag || undefined,
      });
      setHasMore(res.number + 1 < res.totalPages);
      if (reset) {
        setPosts(res.content);
      } else {
        setPosts((prev) => [...prev, ...res.content]);
      }
      setPage(res.number + 1);
    } catch (err: any) {
      toast({
        title: "Could not load community posts",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
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
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    void loadFeed({ reset: true });
    void loadSidebarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedPosts = useMemo(
    () => posts.filter((p) => p.savedByCurrentUser).slice(0, 5),
    [posts]
  );

  const handleShare = (postId: number) => {
    setSelectedPostId(postId);
    setShareDialogOpen(true);
  };

  const handleReport = (postId: number) => {
    setSelectedPostId(postId);
    setReportDialogOpen(true);
  };

  const handleToggleLike = async (postId: number) => {
    const updated = await communityApi.toggleLike(postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
  };

  const handleToggleSave = async (postId: number) => {
    const updated = await communityApi.toggleSave(postId);
    setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)));
  };

  const handleTagClick = (tag: CommunityTagWithCount) => {
    const nextTag = selectedTag === tag.slug ? null : tag.slug;
    setSelectedTag(nextTag);
    void loadFeed({ reset: true, tag: nextTag });
  };

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    void loadFeed();
  };

  return (
    <AppLayout title="Community">
      <div className="px-0 py-0 md:p-6">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-0 lg:gap-6">
          {/* Main column */}
          <div className="space-y-0 md:space-y-6 bg-muted/20 md:bg-transparent">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-0 md:pt-0 md:pb-0">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Community Wall</h1>
                <p className="text-muted-foreground hidden md:block">
                  Share updates with your community and see what others are posting.
                </p>
              </div>
              <Button className="gap-2 hidden sm:inline-flex" onClick={() => setCreatePostOpen(true)}>
                <Plus className="h-4 w-4" />
                New Post
              </Button>
            </div>

            {/* Mobile: quick tag filters (simple + clear) */}
            {topTags.length > 0 && (
              <div className="md:hidden px-4 pb-3">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTag(null);
                      void loadFeed({ reset: true, tag: null });
                    }}
                    className={cn(
                      "flex-shrink-0 h-9 px-4 rounded-full text-xs font-semibold border tap-target transition-all",
                      selectedTag == null
                        ? "bg-gradient-primary text-primary-foreground border-primary/30 shadow-glow shine-active"
                        : "bg-background/70 border-border/70 text-foreground"
                    )}
                    aria-pressed={selectedTag == null}
                  >
                    For you
                  </button>
                  {topTags.slice(0, 10).map((tag) => {
                    const active = selectedTag === tag.slug;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagClick(tag)}
                        className={cn(
                          "flex-shrink-0 h-9 px-4 rounded-full text-xs font-semibold border tap-target transition-all",
                          active
                            ? "bg-gradient-primary text-primary-foreground border-primary/30 shadow-glow shine-active"
                            : "bg-background/70 border-border/70 text-foreground"
                        )}
                        aria-pressed={active}
                      >
                        #{tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create Post Trigger */}
            <div
              className={cn(
                // Mobile: edge-to-edge composer (IG-like)
                "cursor-pointer",
                "bg-background rounded-none shadow-none border-y border-border/70",
                "px-4 py-3",
                // Desktop: keep card feel
                "md:bg-card md:rounded-2xl md:shadow-card md:p-4 md:border md:border-border/60 md:hover:shadow-card-hover md:transition-shadow"
              )}
              onClick={() => setCreatePostOpen(true)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {meAvatar && <AvatarImage src={meAvatar} alt={meName} />}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {meInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted/40 rounded-2xl px-4 py-3 text-muted-foreground text-sm">
                  Write a post…
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreatePostOpen(true);
                  }}
                  aria-label="New post"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {/* Keep composer simple on mobile; details handled inside dialog */}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Image className="h-3.5 w-3.5 text-green-600" />
                  Photo
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  Location
                </span>
                <span className="inline-flex items-center gap-1">
                  <Smile className="h-3.5 w-3.5 text-amber-500" />
                  Emoji
                </span>
              </div>
            </div>

            {/* Posts Feed */}
            {isLoading ? (
              <div className="space-y-0 md:space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <PostCardSkeleton key={i} />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-card rounded-2xl mx-4 md:mx-0">
                <EmptyPosts />
              </div>
            ) : (
              <>
                <div className="space-y-0 md:space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} id={`post-${post.id}`}>
                      <PostCard
                        post={post}
                        onLike={() => handleToggleLike(post.id)}
                        onSave={() => handleToggleSave(post.id)}
                        onShare={() => handleShare(post.id)}
                        onReport={() => handleReport(post.id)}
                      />
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center px-4 py-6 md:px-0">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? "Loading..." : "Load More Posts"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column: tags, saved, analytics */}
          <div className="hidden lg:block">
            <div className="space-y-4 sticky top-20 max-h-[calc(100vh-96px)]">
              {/* Tags */}
              <div className="bg-card rounded-2xl shadow-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm">Trending tags</h2>
                  {selectedTag && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-xs"
                      onClick={() => {
                        setSelectedTag(null);
                        void loadFeed({ reset: true, tag: null });
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {topTags.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Tags will appear here as your community starts posting.
                  </p>
                ) : (
                  <ScrollArea className="h-40 pr-2">
                    <div className="flex flex-wrap gap-1.5">
                      {topTags.map((tag) => {
                        const active = selectedTag === tag.slug;
                        return (
                          <Badge
                            key={tag.id}
                            variant={active ? "default" : "outline"}
                            className={cn(
                              "text-xs rounded-full cursor-pointer",
                              active && "bg-primary text-primary-foreground"
                            )}
                            onClick={() => handleTagClick(tag)}
                          >
                            #{tag.name}
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              {tag.postCount}
                            </span>
                          </Badge>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Saved posts */}
              <div className="bg-card rounded-2xl shadow-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm">Saved posts</h2>
                  <Badge variant="outline" className="text-[10px]">
                    {savedPosts.length}
                  </Badge>
                </div>
                {savedPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Save interesting posts to quickly revisit them here.
                  </p>
                ) : (
                  <ScrollArea className="h-48 pr-2">
                    <div className="space-y-3">
                      {savedPosts.map((post) => (
                        <button
                          key={post.id}
                          className="w-full text-left text-xs rounded-xl px-3 py-2 bg-muted/40 hover:bg-muted transition"
                          onClick={() => {
                            const el = document.getElementById(`post-${post.id}`);
                            el?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                        >
                          <p className="line-clamp-2 text-foreground/90">
                            {post.content}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {post.tags
                              .slice(0, 2)
                              .map((t) => `#${t.name}`)
                              .join(" ")}
                          </p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Analytics */}
              <div className="bg-card rounded-2xl shadow-card p-4">
                <h2 className="font-semibold text-sm mb-3">Your community impact</h2>
                {analytics ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-muted/60 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Total posts</p>
                      <p className="text-lg font-semibold">
                        {analytics.totalPosts}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/60 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        Likes received
                      </p>
                      <p className="text-lg font-semibold">
                        {analytics.totalLikesReceived}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/60 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        Likes given
                      </p>
                      <p className="text-lg font-semibold">
                        {analytics.totalLikesGiven}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/60 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        Saved posts
                      </p>
                      <p className="text-lg font-semibold">
                        {analytics.totalSaves}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Start posting and engaging to see your stats here.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onCreated={(post) => {
          if (!post.location && location) {
            post.location = location;
          }
          if (tagsForNewPost.length && (!post.tags || post.tags.length === 0)) {
            post.tags = tagsForNewPost.map((name, idx) => ({
              id: -idx - 1,
              name,
              slug: name.toLowerCase().replace(/\s+/g, "-"),
            }));
          }
          if (emojiInput && (!post.emojiCodes || post.emojiCodes.length === 0)) {
            post.emojiCodes = emojiInput
              .split("")
              .filter((c) => c.trim().length > 0);
          }
          setPosts((prev) => [post, ...prev]);
        }}
      />
      
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        title="Check out this post!"
        url={`https://samaj.app/posts/${selectedPostId ?? ""}`}
        onCopy={async () => {
          if (selectedPostId != null) {
            try {
              await communityApi.trackShare(selectedPostId);
            } catch {
              // non-blocking
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
