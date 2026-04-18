import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MatrimonyLayout } from "@/components/layout/MatrimonyLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Heart,
  Search,
  Filter,
  MapPin,
  GraduationCap,
  Briefcase,
  MessageCircle,
  Loader2,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { MatrimonyInterestDialog } from "@/components/dialogs/MatrimonyInterestDialog";
import { matrimonyApi, type MatrimonyGender, type MatrimonyProfileCard } from "@/lib/api";

const PAGE_SIZE = 12;

const cities = ["All", "Delhi", "Mumbai", "Bangalore", "Ahmedabad", "Jaipur", "Lucknow", "Pune", "Hyderabad", "Kolkata"];
const professions = ["All", "Doctor", "Engineer", "Teacher", "Business", "Government", "Software", "CA", "Other"];

function formatHeightCm(cm: number | null): string {
  if (cm == null || cm <= 0) return "—";
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return `${ft}'${inch}" (${cm} cm)`;
}

type GenderFilterUi = "all" | "male" | "female";

type AppliedFilters = {
  gender: GenderFilterUi;
  city: string;
  ageRange: [number, number];
  profession: string;
};

const defaultFilters: AppliedFilters = {
  gender: "all",
  city: "All",
  ageRange: [21, 40],
  profession: "All",
};

function mapGenderToApi(g: GenderFilterUi): MatrimonyGender | undefined {
  if (g === "male") return "MALE";
  if (g === "female") return "FEMALE";
  return undefined;
}

export default function Matrimony() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<AppliedFilters>(defaultFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [interestDialogOpen, setInterestDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<MatrimonyProfileCard | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const wasFilterSheetOpen = useRef(false);
  useEffect(() => {
    if (filterOpen && !wasFilterSheetOpen.current) {
      setDraftFilters(appliedFilters);
    }
    wasFilterSheetOpen.current = filterOpen;
  }, [filterOpen, appliedFilters]);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErr,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["matrimony-me"],
    queryFn: () => matrimonyApi.meSummary(),
  });

  const canBrowse = summary?.canBrowse === true;
  const activeProfiles = useMemo(
    () => summary?.profiles.filter((p) => p.status === "ACTIVE") ?? [],
    [summary?.profiles]
  );
  const defaultFromProfileId = activeProfiles[0]?.id ?? "";

  const infinite = useInfiniteQuery({
    queryKey: [
      "matrimony-search",
      appliedFilters.gender,
      appliedFilters.city,
      appliedFilters.ageRange[0],
      appliedFilters.ageRange[1],
      appliedFilters.profession,
      debouncedQ,
    ],
    queryFn: async ({ pageParam }) => {
      return matrimonyApi.searchProfiles({
        page: pageParam as number,
        size: PAGE_SIZE,
        q: debouncedQ || undefined,
        gender: mapGenderToApi(appliedFilters.gender),
        city: appliedFilters.city === "All" ? undefined : appliedFilters.city,
        minAge: appliedFilters.ageRange[0],
        maxAge: appliedFilters.ageRange[1],
        profession: appliedFilters.profession === "All" ? undefined : appliedFilters.profession,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (last) => {
      if (last.totalPages <= 0) return undefined;
      if (last.number < last.totalPages - 1) return last.number + 1;
      return undefined;
    },
    enabled: canBrowse,
    retry: 1,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const flatProfiles = useMemo(
    () => infinite.data?.pages.flatMap((p) => p.content) ?? [],
    [infinite.data?.pages]
  );
  const totalLoaded = flatProfiles.length;
  const totalFromApi = infinite.data?.pages[0]?.totalElements;
  const isDefaultSearch =
    !debouncedQ &&
    appliedFilters.gender === "all" &&
    appliedFilters.city === "All" &&
    appliedFilters.profession === "All" &&
    appliedFilters.ageRange[0] === defaultFilters.ageRange[0] &&
    appliedFilters.ageRange[1] === defaultFilters.ageRange[1];

  const onApplyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
    setFilterOpen(false);
  }, [draftFilters]);

  const onClearFilters = useCallback(() => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  }, []);

  const refetchAll = useCallback(() => {
    void refetchSummary();
    void queryClient.invalidateQueries({ queryKey: ["matrimony-search"] });
  }, [queryClient, refetchSummary]);

  const favMutation = useMutation({
    mutationFn: (profileId: string) => matrimonyApi.toggleFavorite(profileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matrimony-search"] });
    },
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = infinite;

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !canBrowse) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting;
        if (hit && hasNextPage && !isFetchingNextPage && flatProfiles.length > 0) {
          void fetchNextPage();
        }
      },
      { rootMargin: "280px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [canBrowse, fetchNextPage, hasNextPage, isFetchingNextPage, flatProfiles.length]);

  const FilterContent = ({ showApply }: { showApply?: boolean }) => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Looking For</Label>
        <div className="flex gap-2">
          {[
            { id: "all" as const, label: "All" },
            { id: "female" as const, label: "Bride" },
            { id: "male" as const, label: "Groom" },
          ].map((option) => (
            <Button
              key={option.id}
              variant={draftFilters.gender === option.id ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={() => setDraftFilters((d) => ({ ...d, gender: option.id }))}
              className="flex-1"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>
          Age: {draftFilters.ageRange[0]} – {draftFilters.ageRange[1]} yrs
        </Label>
        <Slider
          value={draftFilters.ageRange}
          onValueChange={(v) => setDraftFilters((d) => ({ ...d, ageRange: v as [number, number] }))}
          min={18}
          max={55}
          step={1}
          className="mt-2"
        />
      </div>

      <div className="space-y-2">
        <Label>City</Label>
        <Select value={draftFilters.city} onValueChange={(v) => setDraftFilters((d) => ({ ...d, city: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Profession</Label>
        <Select value={draftFilters.profession} onValueChange={(v) => setDraftFilters((d) => ({ ...d, profession: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {professions.map((prof) => (
              <SelectItem key={prof} value={prof}>
                {prof}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        {showApply && (
          <Button type="button" className="w-full" onClick={onApplyFilters}>
            Apply filters
          </Button>
        )}
        <Button type="button" variant="outline" className="w-full" onClick={onClearFilters}>
          Clear all
        </Button>
      </div>
    </div>
  );

  const handleSendInterest = (card: MatrimonyProfileCard) => {
    if (!defaultFromProfileId) return;
    setSelectedCard(card);
    setInterestDialogOpen(true);
  };

  // Mobile Tinder-like deck state
  const [activeIndex, setActiveIndex] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number; dragging: boolean }>({ x: 0, y: 0, dragging: false });
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActiveIndex(0);
    setDrag({ x: 0, y: 0, dragging: false });
  }, [
    appliedFilters.gender,
    appliedFilters.city,
    appliedFilters.ageRange[0],
    appliedFilters.ageRange[1],
    appliedFilters.profession,
    debouncedQ,
  ]);

  const currentCard = flatProfiles[activeIndex] ?? null;
  const nextCard = flatProfiles[activeIndex + 1] ?? null;

  const swipe = (dir: "left" | "right") => {
    if (!currentCard) return;
    if (dir === "right") handleSendInterest(currentCard);
    setActiveIndex((i) => Math.min(i + 1, Math.max(0, flatProfiles.length)));
    setDrag({ x: 0, y: 0, dragging: false });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, dragging: true });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    setDrag({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y, dragging: true });
  };
  const onPointerUp = () => {
    const threshold = 120;
    if (drag.x > threshold) return swipe("right");
    if (drag.x < -threshold) return swipe("left");
    setDrag({ x: 0, y: 0, dragging: false });
    startRef.current = null;
  };

  /* ——— Gate: no active profile ——— */
  if (summaryLoading) {
    return (
      <MatrimonyLayout title="Matrimony">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 p-6">
          <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </MatrimonyLayout>
    );
  }

  if (summaryError) {
    return (
      <MatrimonyLayout title="Matrimony">
        <div className="p-6 text-center space-y-4">
          <p className="text-destructive">{summaryErr instanceof Error ? summaryErr.message : "Could not load"}</p>
          <Button onClick={() => refetchSummary()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </MatrimonyLayout>
    );
  }

  if (!canBrowse) {
    const drafts = summary?.profiles.filter((p) => p.status === "DRAFT") ?? [];
    return (
      <MatrimonyLayout title="Matrimony">
        <div className="p-4 md:p-6 space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <Heart className="h-14 w-14 text-pink-500 mx-auto" />
            <h1 className="text-2xl font-bold">Matrimony</h1>
            <p className="text-muted-foreground">
              You can only browse other profiles after your own matrimony profile is <strong>active</strong>. Create a
              profile, add photos, then activate.
            </p>
          </div>
          <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500" asChild>
            <Link to="/matrimony/profile/new">Create profile</Link>
          </Button>
          {drafts.length > 0 && (
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <p className="font-medium text-sm">Draft profiles — finish setup</p>
              <ul className="space-y-2">
                {drafts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.displayName}</span>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/matrimony/profile/${p.id}/edit`}>Continue</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </MatrimonyLayout>
    );
  }

  /* ——— Browse (real API + infinite scroll) ——— */
  return (
    <MatrimonyLayout title="Matrimony">
      <div className="p-0 md:p-6">
        {/* Mobile (Tinder-like) */}
        <div className="md:hidden h-[calc(100dvh-64px-80px)] flex flex-col">
          {/* Top controls */}
          <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <div className="flex-1 h-11 rounded-2xl bg-background/70 border border-border/70 px-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search profiles…"
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>

            <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="h-11 w-11 rounded-2xl border border-border/70 bg-background/70 flex items-center justify-center"
                  aria-label="Filters"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <FilterContent showApply />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Deck */}
          <div className="relative flex-1 px-4 pb-4">
            {infinite.isLoading && !infinite.data ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
              </div>
            ) : infinite.isError ? (
              <div className="h-full rounded-3xl border border-destructive/40 bg-destructive/5 flex flex-col items-center justify-center text-center px-6 gap-3">
                <p className="text-sm text-destructive">{(infinite.error as Error)?.message || "Could not load profiles"}</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => infinite.refetch()}>
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : !currentCard ? (
              <div className="h-full rounded-3xl border border-border/70 bg-gradient-card shadow-card flex flex-col items-center justify-center text-center px-6">
                <Heart className="h-12 w-12 text-pink-500" />
                <p className="mt-3 font-semibold">
                  {totalFromApi === 0 && !infinite.isFetching
                    ? isDefaultSearch
                      ? "No profiles to show yet"
                      : "No profiles match these filters"
                    : "No more profiles"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalFromApi === 0 && !infinite.isFetching
                    ? isDefaultSearch
                      ? "When others activate their matrimony profile, they will appear here."
                      : "Try clearing or changing filters."
                    : "Try changing filters or refresh."}
                </p>
                <Button className="mt-4 gap-2" variant="outline" onClick={refetchAll}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            ) : (
              <>
                {nextCard && (
                  <div className="absolute inset-x-4 top-0 bottom-0">
                    <div className="h-full rounded-3xl overflow-hidden bg-muted/30 border border-border/60 shadow-card">
                      <div className="h-full bg-gradient-to-b from-muted/10 to-muted/40" />
                    </div>
                  </div>
                )}

                <div
                  className="absolute inset-x-4 top-0 bottom-0 touch-none"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  style={{
                    transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.x / 18}deg)`,
                    transition: drag.dragging ? "none" : "transform 220ms ease",
                  }}
                >
                  <Link to={`/matrimony/${currentCard.id}`} className="block h-full">
                    <div className="h-full rounded-3xl overflow-hidden bg-card shadow-card border border-border/60 relative">
                      <div className="absolute inset-0 bg-muted">
                        <Avatar className="w-full h-full rounded-none">
                          <AvatarImage src={currentCard.primaryPhotoUrl ?? undefined} className="object-cover" />
                          <AvatarFallback className="rounded-none text-5xl">
                            {currentCard.displayName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

                      <div className="absolute top-4 left-4 flex gap-2">
                        {drag.x > 30 && (
                          <span className="px-3 py-1 rounded-full bg-green-500/90 text-white text-xs font-bold tracking-wider">
                            LIKE
                          </span>
                        )}
                        {drag.x < -30 && (
                          <span className="px-3 py-1 rounded-full bg-red-500/90 text-white text-xs font-bold tracking-wider">
                            NOPE
                          </span>
                        )}
                        {currentCard.verified && (
                          <span className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold ring-1 ring-white/20">
                            Verified
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-end justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white text-xl font-bold truncate">
                              {currentCard.displayName}{" "}
                              <span className="text-white/85 font-semibold">{currentCard.age}</span>
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-white/80 text-sm">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {currentCard.city || "—"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Briefcase className="h-4 w-4" />
                                <span className="truncate">{currentCard.profession || "—"}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="h-11 w-11 rounded-2xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center"
                            onClick={(e) => {
                              e.preventDefault();
                              favMutation.mutate(currentCard.id);
                            }}
                            aria-label={currentCard.favorited ? "Remove from shortlist" : "Shortlist"}
                          >
                            <Star
                              className={
                                currentCard.favorited
                                  ? "h-5 w-5 fill-amber-400 text-amber-400"
                                  : "h-5 w-5 text-white"
                              }
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Bottom actions */}
          <div className="px-6 pb-safe-bottom pb-4 pt-2 flex items-center justify-center gap-4">
            <button
              type="button"
              className="h-14 w-14 rounded-full bg-background shadow-card border border-border/60 flex items-center justify-center"
              onClick={() => swipe("left")}
              aria-label="Nope"
            >
              <X className="h-7 w-7 text-red-500" />
            </button>
            <button
              type="button"
              className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 shadow-glow ring-1 ring-rose-200/20 flex items-center justify-center"
              onClick={() => swipe("right")}
              aria-label="Like"
            >
              <Heart className="h-8 w-8 text-white" />
            </button>
            <Link
              to={currentCard ? `/matrimony/${currentCard.id}` : "/matrimony"}
              className="h-14 w-14 rounded-full bg-background shadow-card border border-border/60 flex items-center justify-center"
              aria-label="Details"
            >
              <MessageCircle className="h-7 w-7 text-primary" />
            </Link>
          </div>
        </div>

        {/* Desktop / existing layout */}
        <div className="hidden md:block space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Heart className="h-7 w-7 text-pink-500" />
              Matrimony
            </h1>
            <p className="text-muted-foreground">Find a match in the community</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={refetchAll}
              disabled={isFetching && !isFetchingNextPage}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching && !isFetchingNextPage ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden shrink-0">
                <Filter className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterContent showApply />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6">
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-card rounded-2xl p-4 shadow-card space-y-4">
              <h3 className="font-semibold">Filters</h3>
              <FilterContent />
              <Button className="w-full" type="button" onClick={onApplyFilters}>
                Apply filters
              </Button>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-4">
              {totalFromApi != null ? (
                <>
                  {totalFromApi} profiles — showing {totalLoaded}
                  {hasNextPage ? " · scroll for more" : ""}
                </>
              ) : (
                "…"
              )}
            </p>

            {infinite.isError && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4 mb-4 text-sm text-destructive">
                {(infinite.error as Error)?.message || "Could not load list"}
                <Button variant="outline" size="sm" className="mt-2" onClick={() => infinite.refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {infinite.isLoading && !infinite.data ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
              </div>
            ) : flatProfiles.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">
                  {totalFromApi === 0 && isDefaultSearch
                    ? "No profiles to show yet"
                    : "No profiles match these filters"}
                </p>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  {totalFromApi === 0 && isDefaultSearch
                    ? "There are no other active matrimony profiles in the community right now."
                    : "Adjust search or filters, or clear them to see more results."}
                </p>
                {!isDefaultSearch && (
                  <Button variant="link" onClick={onClearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {flatProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="group relative bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
                    >
                      <button
                        type="button"
                        className="absolute top-3 right-3 z-10 rounded-full bg-background/90 p-1.5 shadow-sm border"
                        title={profile.favorited ? "Remove from shortlist" : "Shortlist"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          favMutation.mutate(profile.id);
                        }}
                        disabled={favMutation.isPending}
                      >
                        <Star
                          className={`h-5 w-5 ${profile.favorited ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`}
                        />
                      </button>
                      <Link to={`/matrimony/${profile.id}`}>
                        <div className="aspect-square relative bg-muted">
                          <Avatar className="w-full h-full rounded-none">
                            <AvatarImage src={profile.primaryPhotoUrl ?? undefined} className="object-cover" />
                            <AvatarFallback className="rounded-none text-4xl">
                              {profile.displayName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {profile.verified && (
                            <Badge className="absolute top-3 left-3 bg-green-600 text-white">Verified</Badge>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-1">
                            {profile.displayName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {profile.age} yrs • {formatHeightCm(profile.heightCm)}
                          </p>

                          <div className="mt-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Briefcase className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{profile.profession || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{profile.education || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{profile.city || "—"}</span>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{profile.bioShort || "—"}</p>
                        </div>
                      </Link>

                      <div className="px-4 pb-4 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1 bg-pink-500 hover:bg-pink-600"
                          type="button"
                          disabled={!defaultFromProfileId}
                          onClick={(e) => {
                            e.preventDefault();
                            handleSendInterest(profile);
                          }}
                        >
                          <Heart className="h-4 w-4" />
                          Interest
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1" asChild>
                          <Link to={`/matrimony/${profile.id}`}>
                            <MessageCircle className="h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div ref={loadMoreRef} className="h-16 flex items-center justify-center py-6">
                  {isFetchingNextPage && <Loader2 className="h-8 w-8 animate-spin text-pink-500" />}
                  {!hasNextPage && totalLoaded > 0 && (
                    <p className="text-xs text-muted-foreground">All profiles loaded</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

        </div>

        <MatrimonyInterestDialog
        open={interestDialogOpen}
        onOpenChange={setInterestDialogOpen}
        fromProfileId={defaultFromProfileId}
        toProfileId={selectedCard?.id}
        profile={
          selectedCard
            ? {
                name: selectedCard.displayName,
                avatar: selectedCard.primaryPhotoUrl ?? undefined,
                age: selectedCard.age,
                profession: selectedCard.profession ?? "",
                city: selectedCard.city ?? "",
              }
            : undefined
        }
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["matrimony-search"] });
        }}
      />
    </MatrimonyLayout>
  );
}
