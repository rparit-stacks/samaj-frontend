import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { PostCard } from "@/pages/Feeds";
import { ShareDialog } from "@/components/dialogs/ShareDialog";
import { ReportContentDialog } from "@/components/dialogs/ReportContentDialog";
import { buildShareUrl } from "@/lib/shareLinks";
import { communityApi, type CommunityPost } from "@/lib/api";

/**
 * Single post view. This is what a shared /posts/:id link resolves to —
 * without it every shared post landed on the 404 page.
 */
export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const postId = id ? Number(id) : NaN;
  const queryClient = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["community", "post", postId],
    queryFn: () => communityApi.getById(postId),
    enabled: Number.isFinite(postId),
  });

  const patch = (updated: CommunityPost) =>
    queryClient.setQueryData(["community", "post", postId], updated);

  return (
    <AppLayout title="Post">
      <div className="mx-auto max-w-lg">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/50 bg-background/95 px-2 py-2 backdrop-blur">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/feeds" aria-label="Back to feed">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-base font-semibold">Post</h1>
        </div>

        {!Number.isFinite(postId) || isError ? (
          <div className="px-6 py-20 text-center">
            <p className="font-semibold">Post not available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have been deleted, or the link is incorrect.
            </p>
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/feeds">Go to feed</Link>
            </Button>
          </div>
        ) : isLoading || !post ? (
          <div className="space-y-3 p-4">
            <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-56 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : (
          <PostCard
            post={post}
            onLike={() => communityApi.toggleLike(post.id).then(patch)}
            onSave={() => communityApi.toggleSave(post.id).then(patch)}
            onShare={() => setShareOpen(true)}
            onReport={() => setReportOpen(true)}
          />
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title="Check out this post!"
        url={buildShareUrl(`/posts/${postId}`)}
        onCopy={async () => {
          try {
            await communityApi.trackShare(postId);
          } catch {
            /* ignore */
          }
        }}
      />
      <ReportContentDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        contentType="post"
        postId={Number.isFinite(postId) ? postId : null}
      />
    </AppLayout>
  );
}
