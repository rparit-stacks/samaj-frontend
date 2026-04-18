import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Calendar, Share2, Bookmark } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { newsApi, type NewsItem } from "@/lib/api";
import { NewsCard } from "@/components/ui/news-card";
import { NewsCardSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyNews } from "@/components/ui/empty-state";

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function NewsDetail() {
  const { id } = useParams();
  const numericId = id ? Number(id) : NaN;

  const { data: news, isLoading } = useQuery({
    queryKey: ["news", "detail", numericId],
    enabled: !Number.isNaN(numericId),
    queryFn: () => newsApi.get(numericId),
  });

  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ["news", "recommendations", numericId],
    enabled: !Number.isNaN(numericId),
    queryFn: () => newsApi.getRecommendations(numericId, 4),
  });

  if (Number.isNaN(numericId)) {
    return (
      <AppLayout title="News">
        <div className="p-4 md:p-6">
          <EmptyNews />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="News">
      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back Button */}
          <Link to="/news">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ChevronLeft className="h-4 w-4" />
              Back to News
            </Button>
          </Link>

          {isLoading || !news ? (
            <div className="space-y-4">
              <div className="h-8 w-40 bg-muted rounded-md animate-pulse" />
              <div className="h-64 w-full bg-muted rounded-2xl animate-pulse" />
            </div>
          ) : (
            <>
              {/* Article Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary">{news.categoryName}</Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">{news.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(news.publishedAt)}
                  </span>
                </div>
              </div>

              {/* Featured Image */}
              {news.imageUrl && (
                <div className="rounded-2xl overflow-hidden">
                  <img
                    src={news.imageUrl}
                    alt={news.title}
                    className="w-full h-64 md:h-80 object-cover"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  Save
                </Button>
              </div>

              <Separator />

              {/* Article Content */}
              {news.content.includes("<") && news.content.includes(">") ? (
                <article
                  className="prose prose-sm md:prose-base max-w-none"
                  dangerouslySetInnerHTML={{ __html: news.content }}
                />
              ) : (
                <article className="prose prose-sm md:prose-base max-w-none whitespace-pre-wrap text-foreground">
                  {news.content}
                </article>
              )}
            </>
          )}

          {/* Recommendations */}
          <div className="space-y-3">
            <h3 className="font-semibold">Recommended News</h3>
            {loadingRecs ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <NewsCardSkeleton key={i} />
                ))}
              </div>
            ) : (recommendations && recommendations.length > 0) ? (
              <div className="space-y-3">
                {recommendations.map((item: NewsItem) => (
                  <NewsCard
                    key={item.id}
                    id={String(item.id)}
                    title={item.title}
                    summary={item.summary}
                    category={item.categoryName}
                    date={formatDate(item.publishedAt)}
                    image={item.imageUrl ?? undefined}
                    isPinned={item.pinned}
                    isNew={false}
                    variant="compact"
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-2xl">
                <EmptyNews />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
