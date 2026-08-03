import { AppLayout } from "@/components/layout/AppLayout";
import { SectionHeader } from "@/components/ui/section-header";
import { NewsCard } from "@/components/ui/news-card";
import { EventCard } from "@/components/ui/event-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BannerCarousel } from "@/components/BannerCarousel";
import { AchieversMarquee } from "@/components/AchieversMarquee";
import {
  Calendar,
  Newspaper,
  AlertTriangle,
  MessageSquare,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Eye,
  ChevronRight,
  Search as SearchIcon,
  GraduationCap,
  Loader2,
  X,
  Lightbulb,
} from "lucide-react";
import {
  NewsCardSkeleton,
  EventCardSkeleton,
} from "@/components/ui/skeleton-loaders";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  newsApi,
  emergencyApi,
  searchApi,
  eventsApi,
  type NewsItem,
  type EmergencyItem,
  type SearchResultDto,
  type EventItem,
} from "@/lib/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SERVICE_GRID_ITEMS } from "@/lib/serviceGridItems";

/* ─── Helpers ─── */

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** YYYY-MM-DD in local timezone for comparing with API event dates */
function localTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ─── Dashboard Component ─── */

export default function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q.trim(), 280);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { data: newsPage, isLoading: newsLoading } = useQuery({
    queryKey: ["news", "dashboard", "latest"],
    queryFn: () => newsApi.list({ page: 0, size: 3 }),
  });

  const { data: allEmergencies, isLoading: emergencyLoading } = useQuery<EmergencyItem[]>({
    queryKey: ["emergencies", "all"],
    queryFn: emergencyApi.listAll,
  });

  const { data: allEvents = [], isLoading: eventsLoading } = useQuery<EventItem[]>({
    queryKey: ["events", "dashboard"],
    queryFn: () => eventsApi.list({ sort: "list" }),
  });

  const upcomingDashboardEvents = useMemo(() => {
    const today = localTodayIsoDate();
    return allEvents.filter((e) => e.date >= today).slice(0, 3);
  }, [allEvents]);

  const latestNews: NewsItem[] = newsPage?.content ?? [];
  const totalNewsCount = newsPage?.totalElements ?? 0;

  const activeEmergencies = (allEmergencies ?? []).filter(
    (e) => e.status === "OPEN" || e.status === "IN_PROGRESS"
  );
  const latestEmergency = activeEmergencies[0] ?? null;

  const isStatsLoading = newsLoading || emergencyLoading;

  const searchQuery = useQuery({
    queryKey: ["globalSearch", "dashboard", debouncedQ],
    queryFn: () => searchApi.searchAll({ q: debouncedQ, page: 0, size: 8 }),
    enabled: debouncedQ.length >= 2,
  });

  const flatResults: SearchResultDto[] = useMemo(() => {
    const cats = searchQuery.data?.categories ?? [];
    return cats.flatMap((c) => c.results).slice(0, 8);
  }, [searchQuery.data?.categories]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["news"] }),
      qc.invalidateQueries({ queryKey: ["emergencies"] }),
      qc.invalidateQueries({ queryKey: ["events", "dashboard"] }),
      qc.invalidateQueries({ queryKey: ["globalSearch", "dashboard"], exact: false }),
    ]);
  }, [qc]);

  return (
    <AppLayout title="Home" pullToRefresh={handlePullRefresh}>
      <div className="min-h-full w-full max-w-6xl mx-auto px-3 py-3 md:px-6 md:py-6 space-y-4 md:space-y-6 lg:space-y-8">

        {/* Search (server-connected) */}
        <div ref={wrapRef} className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const next = q.trim();
              if (!next) return;
              setOpen(false);
              navigate(`/search?q=${encodeURIComponent(next)}`);
            }}
            className="relative"
          >
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search people, news, events…"
              className="h-11 rounded-full border-0 bg-muted/70 pl-10 pr-10 shadow-none"
              autoComplete="off"
              inputMode="search"
            />
            {q.trim().length > 0 ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl hover:bg-muted/60 flex items-center justify-center"
                onClick={() => {
                  setQ("");
                  setOpen(false);
                }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : searchQuery.isFetching ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </form>

          {open && debouncedQ.length >= 2 && (
            <div className="absolute z-40 mt-2 w-full rounded-3xl border border-border/70 bg-background shadow-card overflow-hidden">
              {searchQuery.isLoading ? (
                <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              ) : flatResults.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No results</div>
              ) : (
                <div className="divide-y divide-border/60">
                  {flatResults.map((r) => (
                    <button
                      key={`${r.service}:${r.id}`}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate(r.link);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 h-9 w-9 rounded-2xl bg-muted/60 flex items-center justify-center ring-1 ring-border/50">
                          {r.service === "EXAMS" ? (
                            <GraduationCap className="h-4 w-4 text-primary" />
                          ) : (
                            <SearchIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{r.title}</p>
                          {(r.subtitle ?? "").trim().length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                      </div>
                    </button>
                  ))}
                  <div className="p-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-2xl"
                      onClick={() => {
                        const next = q.trim();
                        if (!next) return;
                        setOpen(false);
                        navigate(`/search?q=${encodeURIComponent(next)}`);
                      }}
                    >
                      View all results
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Banner Carousel */}
        <BannerCarousel />

        {/* ══════════════════════════════════════════════════════
            MOBILE LAYOUT (md:hidden) — redesigned per reference
           ══════════════════════════════════════════════════════ */}
        <div className="md:hidden space-y-5">

          {/* ── 1. Emergency Alert Banner ── */}
          {emergencyLoading ? (
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 overflow-hidden">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-6 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4 rounded-lg" />
              <Skeleton className="h-10 w-36 mt-1 rounded-2xl" />
            </div>
          ) : latestEmergency ? (
            <div
              role="button"
              tabIndex={0}
              className="block rounded-2xl overflow-hidden border border-destructive/20 bg-destructive/5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => navigate("/emergency")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/emergency");
                }
              }}
            >
              <div className="p-4 space-y-3">
                  {/* Badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                      <span className="text-[10px] font-bold tracking-wider uppercase text-destructive">
                        Critical Alert
                      </span>
                    </span>
                  </div>

                  {/* Title + Description */}
                  <div>
                    <h2 className="text-xl font-bold text-foreground leading-tight">
                      {latestEmergency.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {latestEmergency.description}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {latestEmergency.city ?? "N/A"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(latestEmergency.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {latestEmergency.viewCount}
                    </span>
                  </div>

                  {/* Action Buttons — no <Link> wrapper: tel/wa are <a>, avoids nested anchors */}
                  <div className="flex gap-2 pt-1">
                    {latestEmergency.contactPreferences.phone && (
                      <a
                        href={`tel:${latestEmergency.contactPreferences.phone}`}
                        className={cn(
                          buttonVariants({
                            size: "sm",
                            className:
                              "h-10 px-5 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1.5 rounded-full no-underline",
                          }),
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3.5 w-3.5" /> Call Now
                      </a>
                    )}
                    {latestEmergency.contactPreferences.whatsapp && (
                      <a
                        href={`https://wa.me/${latestEmergency.contactPreferences.whatsapp.replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                          `Hi, I saw your emergency on Samaj.\nEmergency: ${latestEmergency.title}\nID: ${latestEmergency.id}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          buttonVariants({
                            variant: "ghost",
                            size: "sm",
                            className:
                              "h-10 px-4 text-xs font-semibold gap-1.5 rounded-full text-foreground/70 hover:text-foreground no-underline",
                          }),
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    {activeEmergencies.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-10 px-4 text-xs font-semibold gap-1.5 rounded-full text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/emergency");
                        }}
                      >
                        +{activeEmergencies.length - 1} more
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 border bg-card text-center text-sm text-muted-foreground">
              No active emergencies right now.
            </div>
          )}

          <AchieversMarquee />

          {/* ── 2. Community Services Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Community Services</h2>
              <Link
                to="/services"
                className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-0.5"
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SERVICE_GRID_ITEMS.slice(0, 8).map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="flex flex-col items-center gap-1.5 py-2 transition-opacity active:opacity-70"
                >
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", s.color)}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className="max-w-full truncate text-center text-[10px] font-medium text-foreground/80">
                    {s.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── 3. Community Ledger (News) ── */}
          <div>
            <SectionHeader title="Community Ledger" action={{ label: "View all", to: "/news" }} className="mb-3" />

            {newsLoading ? (
              <div className="space-y-3">
                <NewsCardSkeleton variant="featured" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <NewsCardSkeleton key={i} variant="compact" />
                ))}
              </div>
            ) : latestNews.length === 0 ? (
              <div className="rounded-2xl border bg-card p-8 text-center">
                <Newspaper className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No news available.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Featured first news */}
                <NewsCard
                  id={String(latestNews[0]!.id)}
                  title={latestNews[0]!.title}
                  summary={latestNews[0]!.summary}
                  category={latestNews[0]!.categoryName}
                  date={formatDate(latestNews[0]!.publishedAt)}
                  image={latestNews[0]!.imageUrl ?? undefined}
                  isPinned={latestNews[0]!.pinned}
                  isNew={false}
                  variant="featured"
                />
                {/* Compact remaining */}
                {latestNews.slice(1).map((news) => (
                  <NewsCard
                    key={news.id}
                    id={String(news.id)}
                    title={news.title}
                    summary={news.summary}
                    category={news.categoryName}
                    date={formatDate(news.publishedAt)}
                    image={news.imageUrl ?? undefined}
                    isPinned={news.pinned}
                    isNew={false}
                    variant="compact"
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── 4. Upcoming Events ── */}
          <div>
            <SectionHeader title="Upcoming Events" action={{ label: "View all", to: "/events" }} className="mb-3" />
            <div className="space-y-2">
              {eventsLoading ? (
                <>
                  <EventCardSkeleton variant="compact" />
                  <EventCardSkeleton variant="compact" />
                </>
              ) : upcomingDashboardEvents.length === 0 ? (
                <div className="rounded-2xl border bg-card p-6 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No upcoming events.</p>
                </div>
              ) : (
                upcomingDashboardEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    type={event.type}
                    date={event.date}
                    time={event.time}
                    location={event.location}
                    attendees={event.goingCount}
                    variant="compact"
                  />
                ))
              )}
            </div>
          </div>

          {/* ── 5. Civic Connections (Community features) ── */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Civic Connections</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/feeds"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 transition-colors text-center"
              >
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Community Wall</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    Posts and discussions
                  </p>
                </div>
                <span
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-full text-xs h-8 px-4 mt-1 pointer-events-none",
                  )}
                >
                  View Posts
                </span>
              </Link>
              <Link
                to="/suggestions"
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 transition-colors text-center"
              >
                <div className="h-12 w-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                  <Lightbulb className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Suggestions</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    Share ideas with the community
                  </p>
                </div>
                <span
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-full text-xs h-8 px-4 mt-1 pointer-events-none",
                  )}
                >
                  Share Idea
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            DESKTOP LAYOUT (hidden md:block) — redesigned per reference
           ══════════════════════════════════════════════════════ */}
        <div className="hidden md:block space-y-6 lg:space-y-8">

          {/* Emergency Alert */}
          {emergencyLoading ? (
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3 overflow-hidden">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-7 w-2/3 rounded-xl" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
            </div>
          ) : latestEmergency ? (
            <div
              role="button"
              tabIndex={0}
              className="block rounded-2xl overflow-hidden border border-destructive/20 bg-destructive/5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => navigate("/emergency")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/emergency");
                }
              }}
            >
              <div className="p-5 flex items-start gap-5">
                  <div className="flex-1 min-w-0 space-y-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                      <span className="text-[10px] font-bold tracking-wider uppercase text-destructive">
                        Critical Alert
                      </span>
                    </span>
                    <h2 className="text-2xl font-bold text-foreground leading-tight">{latestEmergency.title}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{latestEmergency.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{latestEmergency.city ?? "N/A"}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(latestEmergency.createdAt)}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{latestEmergency.viewCount} views</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      {latestEmergency.contactPreferences.phone && (
                        <a
                          href={`tel:${latestEmergency.contactPreferences.phone}`}
                          className={cn(
                            buttonVariants({
                              size: "sm",
                              className:
                                "h-10 px-5 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-1.5 rounded-full no-underline",
                            }),
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3.5 w-3.5" /> Call Now
                        </a>
                      )}
                      {latestEmergency.contactPreferences.whatsapp && (
                        <a
                          href={`https://wa.me/${latestEmergency.contactPreferences.whatsapp.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            buttonVariants({
                              variant: "ghost",
                              size: "sm",
                              className: "h-10 px-4 text-xs font-semibold gap-1.5 rounded-full no-underline",
                            }),
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="hidden lg:flex shrink-0 h-14 w-14 rounded-2xl bg-destructive/10 items-center justify-center">
                    <AlertTriangle className="h-7 w-7 text-destructive" />
                  </div>
                </div>
                {activeEmergencies.length > 1 && (
                  <div className="px-5 pb-3 flex items-center text-xs text-destructive font-medium gap-1">
                    +{activeEmergencies.length - 1} more active emergencies <ChevronRight className="h-3 w-3" />
                  </div>
                )}
            </div>
          ) : (
            <div className="rounded-2xl p-4 border bg-card text-center text-sm text-muted-foreground">
              No active emergencies right now.
            </div>
          )}

          <AchieversMarquee />

          {/* Community Services Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Community Services</h2>
              <Link
                to="/services"
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
              >
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-5 lg:grid-cols-9 gap-3">
              {SERVICE_GRID_ITEMS.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="flex flex-col items-center gap-2.5 py-4 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 hover:border-primary/20 transition-all"
                >
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", s.color)}>
                    <s.icon className="h-5.5 w-5.5" />
                  </div>
                  <span className="text-xs font-medium text-foreground/80">{s.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Main Content – 2+1 on lg */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Community Ledger (News) */}
            <div className="lg:col-span-2 space-y-4 min-w-0">
              <SectionHeader title="Community Ledger" action={{ label: "View all", to: "/news" }} />
              {newsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <NewsCardSkeleton key={i} />
                  ))}
                </div>
              ) : latestNews.length === 0 ? (
                <div className="rounded-2xl border bg-card p-8 text-center">
                  <Newspaper className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No news available right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <NewsCard
                    id={String(latestNews[0]!.id)}
                    title={latestNews[0]!.title}
                    summary={latestNews[0]!.summary}
                    category={latestNews[0]!.categoryName}
                    date={formatDate(latestNews[0]!.publishedAt)}
                    image={latestNews[0]!.imageUrl ?? undefined}
                    isPinned={latestNews[0]!.pinned}
                    isNew={false}
                    variant="featured"
                  />
                  {latestNews.slice(1).map((news) => (
                    <NewsCard
                      key={news.id}
                      id={String(news.id)}
                      title={news.title}
                      summary={news.summary}
                      category={news.categoryName}
                      date={formatDate(news.publishedAt)}
                      image={news.imageUrl ?? undefined}
                      isPinned={news.pinned}
                      isNew={false}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right sidebar: Events + Connections */}
            <div className="space-y-6 min-w-0">
              {/* Events Section */}
              <div>
                <SectionHeader title="Upcoming Events" action={{ label: "View all", to: "/events" }} />
                <div className="space-y-3 mt-4">
                  {eventsLoading ? (
                    <>
                      <EventCardSkeleton variant="compact" />
                      <EventCardSkeleton variant="compact" />
                    </>
                  ) : upcomingDashboardEvents.length === 0 ? (
                    <div className="rounded-2xl border bg-card p-6 text-center">
                      <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No upcoming events.</p>
                    </div>
                  ) : (
                    upcomingDashboardEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        id={event.id}
                        title={event.title}
                        type={event.type}
                        date={event.date}
                        time={event.time}
                        location={event.location}
                        attendees={event.goingCount}
                        variant="compact"
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Civic Connections */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Civic Connections</h3>
                <div className="space-y-3">
                  <Link
                    to="/feeds"
                    className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Community Wall</p>
                      <p className="text-xs text-muted-foreground">Posts and discussions</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                  <Link
                    to="/suggestions"
                    className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card hover:bg-muted/40 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Suggestions</p>
                      <p className="text-xs text-muted-foreground">Share ideas with the community</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
