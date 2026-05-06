import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { businessApi, type BusinessSummaryDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Plus, Search, MapPin, Phone, ChevronLeft, ChevronRight,
  Star, SlidersHorizontal, X,
} from "lucide-react";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "Food & Dining", value: "Food & Dining" },
  { label: "Retail", value: "Retail" },
  { label: "Services", value: "Services" },
  { label: "Health", value: "Health" },
  { label: "Education", value: "Education" },
  { label: "Technology", value: "Technology" },
  { label: "Other", value: "Other" },
];

function BusinessCard({ b }: { b: BusinessSummaryDto }) {
  return (
    <Link
      to={`/business/${b.id}`}
      className="flex gap-3 items-start rounded-2xl border border-border/60 bg-card p-3 hover:bg-muted/40 active:scale-[0.99] transition-all"
    >
      {/* Thumbnail */}
      <div className="relative w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
        {b.firstPhoto ? (
          <img src={b.firstPhoto} alt={b.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Briefcase className="h-7 w-7 text-muted-foreground/25" />
          </div>
        )}
        {b.featured && (
          <div className="absolute inset-0 flex items-end justify-center pb-1">
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-medium">
              <Star className="h-2.5 w-2.5" /> Top
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-0.5">
        <p className="font-semibold text-sm leading-snug line-clamp-2 pr-1">{b.name}</p>

        {b.category && (
          <span className="inline-block mt-1 text-[11px] font-medium text-primary bg-primary/8 px-2 py-0.5 rounded-full">
            {b.category}
          </span>
        )}

        <div className="mt-1.5 flex flex-col gap-0.5">
          {b.city && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
              <span className="truncate">{b.city}</span>
            </span>
          )}
          {b.phone && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
              <span className="truncate">{b.phone}</span>
            </span>
          )}
        </div>
      </div>

      {/* Arrow indicator */}
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 self-center" />
    </Link>
  );
}

function BusinessCardSkeleton() {
  return (
    <div className="flex gap-3 items-start rounded-2xl border border-border/60 bg-card p-3">
      <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3 rounded-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function Business() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["business", "list", category, page],
    queryFn: () => businessApi.list({ category: category || undefined, page, size: 15 }),
  });

  const filtered = (data?.content ?? []).filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.category?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q)
    );
  });

  const totalPages = data?.totalPages ?? 1;

  return (
    <AppLayout title="Business">
      <div className={`${APP_PAGE_CONTAINER} flex flex-col gap-4`}>

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Business Directory</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.totalElements ? `${data.totalElements} businesses` : "Community businesses"}
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5 rounded-xl h-9 px-3 flex-shrink-0">
            <Link to="/business/create">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Add</span>
            </Link>
          </Button>
        </div>

        {/* Search + filter row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search businesses..."
              className="pl-9 h-10 rounded-xl bg-muted/50 border-border/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-colors flex-shrink-0 ${
              category
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-border/50 text-muted-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Category chips — collapsible on mobile */}
        {showFilters && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 md:mx-0 md:px-0">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value); setPage(0); setShowFilters(false); }}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all flex-shrink-0 ${
                  category === c.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border/60 text-muted-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Active category pill */}
        {category && !showFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtered by:</span>
            <button
              onClick={() => { setCategory(""); setPage(0); }}
              className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full"
            >
              {category} <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* My listings shortcut */}
        <Link
          to="/business/my"
          className="flex items-center justify-between px-4 py-3 rounded-2xl bg-cyan-500/8 border border-cyan-500/20 group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">My listings</p>
              <p className="text-xs text-muted-foreground">Manage your businesses</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
        </Link>

        {/* List */}
        {isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-semibold text-foreground">No businesses found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || category ? "Try adjusting your search or filters" : "Be the first to list your business!"}
              </p>
            </div>
            {!search && !category && (
              <Button asChild size="sm" className="gap-1.5 mt-1">
                <Link to="/business/create"><Plus className="h-4 w-4" /> List your business</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((b) => <BusinessCard key={b.id} b={b} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
