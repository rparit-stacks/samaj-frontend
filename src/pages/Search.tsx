import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Search as SearchIcon,
  Newspaper,
  Calendar,
  GraduationCap,
  Heart,
  AlertTriangle,
  UserRound,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  searchApi,
  isSearchServiceType,
  type SearchCategoryResponse,
  type SearchResultDto,
  type SearchServiceType,
} from "@/lib/api";

const serviceConfig: Record<
  SearchServiceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  USERS: { label: "People", icon: UserRound, tone: "bg-sky-500/10 text-sky-700" },
  NEWS: { label: "News", icon: Newspaper, tone: "bg-emerald-500/10 text-emerald-700" },
  EVENTS: { label: "Events", icon: Calendar, tone: "bg-amber-500/10 text-amber-700" },
  EXAMS: { label: "Exams", icon: GraduationCap, tone: "bg-violet-500/10 text-violet-700" },
  MATRIMONY: { label: "Matrimony", icon: Heart, tone: "bg-rose-500/10 text-rose-700" },
  EMERGENCIES: { label: "SOS", icon: AlertTriangle, tone: "bg-red-500/10 text-red-700" },
};

const allServices: SearchServiceType[] = ["USERS", "NEWS", "EVENTS", "EXAMS", "MATRIMONY", "EMERGENCIES"];

const searchFallbackUi = {
  label: "Results",
  icon: SearchIcon,
  tone: "bg-muted text-muted-foreground",
} as const;

function searchServiceUi(service: string) {
  return isSearchServiceType(service) ? serviceConfig[service] : { ...searchFallbackUi, label: service };
}

function normalizeQ(q: string | null) {
  return (q ?? "").trim();
}

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialQ = normalizeQ(searchParams.get("q"));
  const initialServiceParam = (searchParams.get("service") ?? "").toUpperCase();
  const initialService: SearchServiceType | "ALL" = allServices.includes(initialServiceParam as SearchServiceType)
    ? (initialServiceParam as SearchServiceType)
    : "ALL";

  const [qInput, setQInput] = useState(initialQ);
  const [service, setService] = useState<SearchServiceType | "ALL">(initialService);

  useEffect(() => {
    setQInput(initialQ);
    setService(initialService);
  }, [initialQ, initialService]);

  const queryEnabled = initialQ.length > 0;

  const combinedQuery = useQuery({
    queryKey: ["globalSearch", initialQ, service],
    queryFn: () => searchApi.searchAll({ q: initialQ, page: 0, size: 30 }),
    enabled: queryEnabled && service === "ALL",
  });

  const singleQuery = useQuery({
    queryKey: ["globalSearch", initialQ, service, "single"],
    queryFn: () => searchApi.searchByService(service as SearchServiceType, { q: initialQ, page: 0, size: 30 }),
    enabled: queryEnabled && service !== "ALL",
  });

  const categories: SearchCategoryResponse[] = useMemo(() => {
    if (!queryEnabled) return [];
    if (service === "ALL") return combinedQuery.data?.categories ?? [];
    return singleQuery.data ? [singleQuery.data] : [];
  }, [combinedQuery.data, queryEnabled, service, singleQuery.data]);

  const isLoading = combinedQuery.isLoading || singleQuery.isLoading;
  const isError = combinedQuery.isError || singleQuery.isError;
  const totalResults = useMemo(() => categories.reduce((acc, c) => acc + c.results.length, 0), [categories]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = qInput.trim();
    if (!next) {
      navigate("/search");
      return;
    }
    const serviceQs = service !== "ALL" ? `&service=${encodeURIComponent(service)}` : "";
    navigate(`/search?q=${encodeURIComponent(next)}${serviceQs}`);
  };

  const clear = () => {
    setQInput("");
    navigate("/search");
  };

  return (
    <AppLayout title="Search">
      <div className="mx-auto max-w-lg pb-6">
        <div className="sticky top-0 z-20 border-b border-border/50 bg-background/95 px-3 py-3 backdrop-blur">
          <form onSubmit={onSubmit} className="relative">
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search people, news, events…"
              className="h-11 rounded-full border-0 bg-muted/70 pl-10 pr-10 text-[15px]"
              autoComplete="off"
              autoFocus
            />
            {qInput.trim().length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full"
                onClick={clear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>

          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              className={cn(
                "h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors",
                service === "ALL" ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground",
              )}
              onClick={() => {
                setService("ALL");
                const q = qInput.trim() || initialQ;
                if (!q) return;
                navigate(`/search?q=${encodeURIComponent(q)}`);
              }}
            >
              All
            </button>
            {allServices.map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  "h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors",
                  service === s ? "bg-foreground text-background" : "bg-muted/70 text-muted-foreground",
                )}
                onClick={() => {
                  setService(s);
                  const q = qInput.trim() || initialQ;
                  if (!q) return;
                  navigate(`/search?q=${encodeURIComponent(q)}&service=${encodeURIComponent(s)}`);
                }}
              >
                {serviceConfig[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pt-3">
          {!queryEnabled ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <SearchIcon className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Search the community</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Find members, news, events, exams and more.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="py-12 text-center text-sm text-destructive">Search failed. Try again.</p>
          ) : categories.length === 0 || totalResults === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No results for “{initialQ}”</p>
              <p className="text-sm text-muted-foreground">Try another keyword or category.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {queryEnabled && (
                <p className="px-1 text-xs text-muted-foreground">
                  {totalResults} result{totalResults === 1 ? "" : "s"}
                </p>
              )}
              {categories.map((cat) => (
                <CategorySection key={cat.service} category={cat} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function CategorySection({ category }: { category: SearchCategoryResponse }) {
  const config = searchServiceUi(category.service);
  const Icon = config.icon;
  if (category.results.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", config.tone)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold">{config.label}</h2>
        <span className="text-xs text-muted-foreground">{category.results.length}</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
        {category.results.map((r, i) => (
          <SearchResultRow
            key={r.service + ":" + r.id}
            result={r}
            last={i === category.results.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function SearchResultRow({ result, last }: { result: SearchResultDto; last?: boolean }) {
  const config = searchServiceUi(result.service);
  const Icon = config.icon;

  return (
    <Link
      to={result.link}
      className={cn(
        "flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40",
        !last && "border-b border-border/40",
      )}
    >
      {(result.imageUrl ?? "").trim() ? (
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={result.imageUrl ?? undefined} alt={result.title} />
          <AvatarFallback>{result.title?.slice(0, 1)?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
      ) : (
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", config.tone)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold">{result.title}</p>
        {(result.subtitle ?? "").trim().length > 0 && (
          <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
