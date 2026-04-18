import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search as SearchIcon, Newspaper, Calendar, GraduationCap, Heart, AlertTriangle, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  searchApi,
  isSearchServiceType,
  type SearchAllResponse,
  type SearchCategoryResponse,
  type SearchResultDto,
  type SearchServiceType,
} from "@/lib/api";
import { Link } from "react-router-dom";

const serviceConfig: Record<SearchServiceType, { label: string; icon: React.ComponentType<{ className?: string }> ; badgeClass: string }> = {
  USERS: { label: "Members", icon: UserRound, badgeClass: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  NEWS: { label: "News", icon: Newspaper, badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  EVENTS: { label: "Events", icon: Calendar, badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  EXAMS: { label: "Exams", icon: GraduationCap, badgeClass: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  MATRIMONY: { label: "Matrimony", icon: Heart, badgeClass: "bg-pink-500/10 text-pink-700 border-pink-500/20" },
  EMERGENCIES: { label: "Emergency", icon: AlertTriangle, badgeClass: "bg-destructive/10 text-destructive border-destructive/20" },
};

const allServices: SearchServiceType[] = ["USERS", "NEWS", "EVENTS", "EXAMS", "MATRIMONY", "EMERGENCIES"];

const searchFallbackUi = {
  label: "Results",
  icon: SearchIcon,
  badgeClass: "bg-muted text-muted-foreground border-border",
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
    // Keep service in sync when URL changes (e.g. back button).
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

  const totalResults = useMemo(() => categories.reduce((acc, c) => acc + c.results.length, 0), [categories]);

  return (
    <AppLayout title="Search">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header / Search bar */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Search</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Exams are queried on the server today; other category tabs use the same API and may show no matches until
                those backends are connected.
              </p>
            </div>
            {queryEnabled && (
              <Badge variant="outline" className="text-sm">
                {totalResults} results
              </Badge>
            )}
          </div>

          {/* Service filter (particular search) */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <Button
              type="button"
              size="sm"
              variant={service === "ALL" ? "default" : "outline"}
              className="flex-shrink-0 rounded-full"
              onClick={() => {
                setService("ALL");
                const q = qInput.trim() || initialQ;
                if (!q) return;
                navigate(`/search?q=${encodeURIComponent(q)}`);
              }}
            >
              All
            </Button>
            {allServices.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={service === s ? "default" : "outline"}
                className="flex-shrink-0 rounded-full"
                onClick={() => {
                  setService(s);
                  const q = qInput.trim() || initialQ;
                  if (!q) return;
                  navigate(`/search?q=${encodeURIComponent(q)}&service=${encodeURIComponent(s)}`);
                }}
              >
                {serviceConfig[s].label}
              </Button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Type to search..."
              className="pl-10"
              autoComplete="off"
            />
            {qInput.trim().length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                onClick={clear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>

        {/* Content */}
        {!queryEnabled ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center space-y-2">
                <SearchIcon className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  Start typing to see results from{" "}
                  {service === "ALL" ? "all services" : searchServiceUi(service).label}.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-destructive text-center">Search failed. Please try again.</p>
            </CardContent>
          </Card>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center space-y-2">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No results found for "{initialQ}".</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
              <CategorySection key={cat.service} category={cat} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function CategorySection({ category }: { category: SearchCategoryResponse }) {
  const config = searchServiceUi(category.service);
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("rounded-xl p-2", config.badgeClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{config.label}</CardTitle>
            <p className="text-sm text-muted-foreground">{category.results.length} shown</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {category.total} total
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2">
        {category.results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches.</p>
        ) : (
          <div className="space-y-1">
            {category.results.map((r) => (
              <SearchResultRow key={r.service + ":" + r.id} result={r} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SearchResultRow({ result }: { result: SearchResultDto }) {
  const config = searchServiceUi(result.service);
  const Icon = config.icon;

  return (
    <Link
      to={result.link}
      className="block rounded-xl border border-border/50 hover:border-primary/50 hover:bg-muted/40 transition-colors px-3 py-2"
    >
      <div className="flex items-start gap-3">
        {(result.imageUrl ?? "").trim() ? (
          <Avatar className="h-10 w-10">
            <AvatarImage src={result.imageUrl ?? undefined} alt={result.title} />
            <AvatarFallback>{result.title?.slice(0, 1)?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn("rounded-xl p-2", config.badgeClass)}>
            <Icon className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{result.title}</p>
          {(result.subtitle ?? "").trim().length > 0 && (
            <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
          )}
          {(result.description ?? "").trim().length > 0 && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{result.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

