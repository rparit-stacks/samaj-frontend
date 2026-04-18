import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { NewsCard } from "@/components/ui/news-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewsCardSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyNews, EmptySearch } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { newsApi, type NewsCategory, type NewsItem } from "@/lib/api";

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isNew(publishedAt: string | null) {
  if (!publishedAt) return false;
  const published = new Date(publishedAt).getTime();
  const now = Date.now();
  const diffDays = (now - published) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export default function News() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");

  const { data: categoriesData } = useQuery({
    queryKey: ["news", "categories"],
    queryFn: () => newsApi.getCategories(),
  });

  const { data: newsPage, isLoading } = useQuery({
    queryKey: ["news", "list", selectedCategory],
    queryFn: () =>
      newsApi.list({
        page: 0,
        size: 100,
        categoryId: selectedCategory === "all" ? undefined : selectedCategory,
      }),
  });

  const categories: ({ id: "all"; label: string } | { id: number; label: string })[] = [
    { id: "all", label: "All" },
    ...(categoriesData ?? []).map((c: NewsCategory) => ({
      id: c.id,
      label: c.name,
    })),
  ];

  const q = searchQuery.trim().toLowerCase();
  const newsItems: NewsItem[] = (newsPage?.content ?? []).filter((n) =>
    !q
      ? true
      : (n.title ?? "").toLowerCase().includes(q) ||
        (n.summary ?? "").toLowerCase().includes(q)
  );

  const mapped = newsItems.map((n) => ({
    id: String(n.id),
    title: n.title,
    summary: n.summary,
    category: n.categoryName,
    date: formatDate(n.publishedAt),
    image: n.imageUrl ?? undefined,
    isPinned: n.pinned,
    isNew: isNew(n.publishedAt),
  }));

  const pinnedNews = mapped.filter((n) => n.isPinned);
  const regularNews = mapped.filter((n) => !n.isPinned);

  return (
    <AppLayout title="News">
      <div className="p-4 md:p-6 space-y-6">
        {/* Premium Header */}
        <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-5 md:p-6 shadow-glow overflow-hidden relative">
          <div className="absolute inset-0 opacity-20" aria-hidden="true">
            <div className="absolute -top-10 -left-10 h-44 w-44 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-10 -right-12 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Samaj News</h1>
            <p className="text-primary-foreground/85 text-sm mt-1">
              Announcements, updates, and community highlights.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search Bar (premium) */}
          <div className="rounded-3xl border border-border/70 bg-gradient-card shadow-card p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-2xl bg-background/60 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/40"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-2xl"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {categoriesData ? (
              categories.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "flex-shrink-0 px-4 h-9 rounded-full text-xs font-semibold transition-all tap-target",
                      "border",
                      isActive
                        ? "bg-gradient-primary text-primary-foreground border-primary/30 shadow-glow shine-active"
                        : "bg-background/60 text-foreground border-border/70 hover:bg-muted/60"
                    )}
                    aria-pressed={isActive}
                  >
                    {category.label}
                  </button>
                );
              })
            ) : (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-20 rounded-full" />
                ))}
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <NewsCardSkeleton key={i} variant="featured" />
              ))}
            </div>
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <NewsCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Featured/Pinned News */}
            {pinnedNews.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-2xl bg-primary/10 text-primary">
                      📌
                    </span>
                    Pinned
                  </h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {pinnedNews.map((news) => (
                    <NewsCard key={news.id} {...news} variant="featured" />
                  ))}
                </div>
              </div>
            )}

            {/* News List */}
            <div className="space-y-4">
              {pinnedNews.length > 0 && regularNews.length > 0 && (
                <h2 className="text-lg font-semibold">Latest News</h2>
              )}
              
              {regularNews.length === 0 && pinnedNews.length === 0 ? (
                <div className="bg-card rounded-2xl">
                  {searchQuery || selectedCategory !== "all" ? (
                    <EmptySearch 
                      onClear={() => { setSearchQuery(""); setSelectedCategory("all"); }}
                    />
                  ) : (
                    <EmptyNews />
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {regularNews.map((news) => (
                    <NewsCard key={news.id} {...news} variant="compact" />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
