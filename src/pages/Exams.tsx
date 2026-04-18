import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, GraduationCap, Calendar, ExternalLink,
  Clock, Bell, Filter, Eye, Bookmark, Loader2, ChevronDown, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ExamDetailDialog } from "@/components/dialogs/ExamDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { examsApi, type ExamDto } from "@/lib/api";

const TYPE_FILTER_PRESETS = ["upsc", "ssc", "banking", "state"] as const;

const typeBadgeClass = (t: string) => {
  const key = t.toLowerCase();
  const map: Record<string, string> = {
    upsc: "bg-purple-100 text-purple-700 border-purple-200",
    ssc: "bg-blue-100 text-blue-700 border-blue-200",
    banking: "bg-green-100 text-green-700 border-green-200",
    state: "bg-amber-100 text-amber-700 border-amber-200",
  };
  return map[key] ?? "bg-muted/70 text-foreground border-border";
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Exams() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  /** Empty = all categories; otherwise exact match (case-insensitive on server). */
  const [typeFilter, setTypeFilter] = useState("");
  const [recencyFilter, setRecencyFilter] = useState<"all" | "new" | "old">("all");
  const [tab, setTab] = useState<"all" | "saved" | "alerts">("all");
  const [selectedExam, setSelectedExam] = useState<ExamDto | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const pageSize = 15;

  const examIdFromQuery = searchParams.get("examId");
  useEffect(() => {
    if (!examIdFromQuery) return;
    let cancelled = false;
    examsApi
      .get(examIdFromQuery)
      .then((exam) => {
        if (cancelled) return;
        setSelectedExam(exam);
        setDetailDialogOpen(true);
      })
      .catch((e) => {
        if (cancelled) return;
        toast({
          title: "Could not open exam",
          description: e instanceof Error ? e.message : "Try again",
          variant: "destructive",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [examIdFromQuery, toast]);

  const listQuery = useInfiniteQuery({
    queryKey: ["exams", tab, searchQuery.trim() || undefined, typeFilter.trim() || undefined, recencyFilter],
    queryFn: ({ pageParam }) => {
      if (tab === "saved") {
        return examsApi.listSaved({ page: pageParam as number, size: pageSize });
      }
      if (tab === "alerts") {
        return examsApi.listAlerts({ page: pageParam as number, size: pageSize });
      }
      return examsApi.list({
        page: pageParam as number,
        size: pageSize,
        q: searchQuery.trim() || undefined,
        type: typeFilter.trim() || undefined,
        filter: recencyFilter === "all" ? undefined : recencyFilter,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.number + 1;
      return next < lastPage.totalPages ? next : undefined;
    },
  });

  const exams = useMemo(() => {
    const pages = listQuery.data?.pages ?? [];
    return pages.flatMap((p) => p.content);
  }, [listQuery.data]);

  const upcomingDeadlines = useMemo(() => {
    const active = exams.filter((e) => !e.expired && e.lastDate);
    active.sort((a, b) => new Date(a.lastDate!).getTime() - new Date(b.lastDate!).getTime());
    return active.slice(0, 5);
  }, [exams]);

  const handleViewDetails = (exam: ExamDto) => {
    setSelectedExam(exam);
    setDetailDialogOpen(true);
    examsApi.get(exam.id).then(setSelectedExam).catch(() => {
      /* keep list row snapshot if fetch fails */
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (body: { id: string; saved: boolean }) => {
      if (body.saved) return examsApi.unsave(body.id);
      return examsApi.save(body.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast({
        title: data?.message ?? "Updated",
      });
    },
    onError: (e) => {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const alertMutation = useMutation({
    mutationFn: async (body: { id: string; enabled: boolean }) => {
      if (body.enabled) return examsApi.disableAlert(body.id);
      return examsApi.enableAlert(body.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast({
        title: data?.message ?? "Alert updated",
      });
    },
    onError: (e) => {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    },
  });

  return (
    <AppLayout title="Exams">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-6xl mx-auto w-full min-w-0">
        {/* Header */}
        <div className="min-w-0">
          <div className="flex items-start gap-2 sm:items-center mb-2 min-w-0">
            <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0 mt-0.5 sm:mt-0" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight break-words">
              Exams & Scholarships
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base leading-relaxed">
            Find and apply to government exams, competitive tests, and scholarship opportunities
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 min-w-0">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow min-w-0">
            <CardContent className="p-2.5 sm:p-4 text-center">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary tabular-nums">{exams.length}</p>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-1">Active</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow min-w-0">
            <CardContent className="p-2.5 sm:p-4 text-center">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 tabular-nums">{exams.filter((e) => e.saved).length}</p>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-1">Saved</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow min-w-0">
            <CardContent className="p-2.5 sm:p-4 text-center">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 tabular-nums">{exams.filter((e) => e.alertEnabled).length}</p>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-1">Alerts</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow min-w-0">
            <CardContent className="p-2.5 sm:p-4 text-center">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600 tabular-nums">
                {exams.filter((e) => {
                  const days = daysUntil(e.lastDate);
                  return !e.expired && days !== null && days <= 7;
                }).length}
              </p>
              <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-1">Urgent</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by title or type…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-base sm:text-sm min-w-0"
                disabled={tab !== "all"}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden shrink-0 h-11 w-full flex items-center justify-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
            </Button>
          </div>

          {/* Filters - Mobile Collapsible, Desktop Always Visible */}
          <div className={cn(
            "space-y-2 transition-all overflow-hidden",
            showFilters ? "block" : "hidden sm:block"
          )}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-2 min-w-0">
                <p className="text-xs text-muted-foreground">Exam category</p>
                <Input
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  list="member-exam-type-suggestions"
                  placeholder="Any — or type a category (e.g. Railway)"
                  disabled={tab !== "all"}
                  className="h-10"
                />
                <datalist id="member-exam-type-suggestions">
                  {TYPE_FILTER_PRESETS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                  <option value="railway" />
                  <option value="defence" />
                  <option value="scholarship" />
                </datalist>
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant={!typeFilter.trim() ? "secondary" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    disabled={tab !== "all"}
                    onClick={() => setTypeFilter("")}
                  >
                    All types
                  </Button>
                  {TYPE_FILTER_PRESETS.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={typeFilter.trim().toLowerCase() === p ? "secondary" : "outline"}
                      size="sm"
                      className="h-8 text-xs capitalize"
                      disabled={tab !== "all"}
                      onClick={() => setTypeFilter(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>

              <Select value={recencyFilter} onValueChange={(v) => setRecencyFilter(v as "all" | "new" | "old")} disabled={tab !== "all"}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New Exams</SelectItem>
                  <SelectItem value="old">Closed Exams</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-w-0">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 min-w-0">
            {/* Urgent deadlines — mobile / tablet (desktop uses sidebar) */}
            <div className="lg:hidden">
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm">
                    <Clock className="h-4 w-4 text-destructive shrink-0" />
                    Urgent deadlines
                  </h3>
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No upcoming deadlines in this list.</p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:thin]">
                      {upcomingDeadlines.map((exam) => {
                        const daysLeft = daysUntil(exam.lastDate);
                        return (
                          <button
                            type="button"
                            key={exam.id}
                            className={cn(
                              "min-w-[min(100%,14rem)] max-w-[85vw] shrink-0 snap-start rounded-lg border p-3 text-left text-xs transition-colors",
                              daysLeft !== null && daysLeft <= 3
                                ? "bg-red-50 border-red-200 hover:bg-red-100"
                                : "bg-amber-50 border-amber-200 hover:bg-amber-100"
                            )}
                            onClick={() => handleViewDetails(exam)}
                          >
                            <p className="font-medium line-clamp-2 leading-snug">{exam.title}</p>
                            <div className="flex items-center justify-between gap-2 mt-2">
                              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                                {exam.type}
                              </Badge>
                              <span
                                className={cn(
                                  "font-semibold tabular-nums shrink-0",
                                  daysLeft !== null && daysLeft <= 3 ? "text-red-700" : "text-amber-700"
                                )}
                              >
                                {daysLeft !== null && daysLeft > 0 ? `${daysLeft}d` : "Today"}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full min-w-0">
              <TabsList className="w-full grid grid-cols-3 h-11 sm:h-10 p-1 gap-0.5">
                <TabsTrigger value="all" className="text-[11px] sm:text-sm px-1 sm:px-3">
                  All
                </TabsTrigger>
                <TabsTrigger value="saved" className="text-[11px] sm:text-sm px-1 sm:px-3">
                  Saved
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-[11px] sm:text-sm px-1 sm:px-3">
                  Alerts
                </TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="space-y-3 mt-4">
                {listQuery.isLoading ? (
                  <div className="text-center py-12 bg-card rounded-xl">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading exams...</p>
                  </div>
                ) : listQuery.isError ? (
                  <div className="text-center py-12 bg-card rounded-xl border border-destructive/20">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {listQuery.error instanceof Error ? listQuery.error.message : "Failed to load exams"}
                    </p>
                  </div>
                ) : exams.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-xl">
                    <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No exams found. Try adjusting your filters.</p>
                  </div>
                ) : (
                  <>
                    {exams.map((exam) => {
                      const daysLeft = daysUntil(exam.lastDate);
                      const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
                      const isClosed = daysLeft !== null && daysLeft <= 0;

                      return (
                        <Card
                          key={exam.id}
                          className={cn(
                            "border-0 shadow-sm hover:shadow-md transition-all cursor-pointer min-w-0",
                            isUrgent && "border-l-4 border-amber-500 bg-amber-50/30"
                          )}
                          onClick={() => handleViewDetails(exam)}
                        >
                          <CardContent className="p-3 sm:p-4 min-w-0">
                            <div className="space-y-3 min-w-0">
                              {/* Title and Badges */}
                              <div className="min-w-0">
                                <div className="flex items-start gap-2 flex-wrap mb-2">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-[10px] sm:text-xs shrink-0 max-w-full truncate", typeBadgeClass(exam.type))}
                                  >
                                    {exam.type}
                                  </Badge>
                                  {exam.expired && (
                                    <Badge className="bg-red-100 text-red-700 text-xs">Expired</Badge>
                                  )}
                                  {isUrgent && (
                                    <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {daysLeft}d left
                                    </Badge>
                                  )}
                                  {isClosed && (
                                    <Badge className="bg-gray-100 text-gray-700 text-xs">Closed</Badge>
                                  )}
                                </div>
                                <h3 className="font-semibold text-sm sm:text-base line-clamp-3 break-words">{exam.title}</h3>
                              </div>

                              {/* Key Dates — stack on small phones, row from sm */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm min-w-0">
                                <div className="bg-muted/50 rounded-lg p-2.5 sm:p-2 min-w-0">
                                  <p className="text-muted-foreground text-[11px] sm:text-xs">Notification</p>
                                  <p className="font-medium tabular-nums">{formatDate(exam.notificationDate)}</p>
                                </div>
                                <div className={cn(
                                  "rounded-lg p-2.5 sm:p-2 min-w-0",
                                  isClosed ? "bg-gray-100" : isUrgent ? "bg-amber-100/50" : "bg-red-100/20"
                                )}>
                                  <p className={cn(
                                    "text-[11px] sm:text-xs",
                                    isClosed ? "text-gray-600" : isUrgent ? "text-amber-700" : "text-red-700"
                                  )}>
                                    Last date
                                  </p>
                                  <p className={cn(
                                    "font-medium tabular-nums",
                                    isClosed ? "text-gray-600" : isUrgent ? "text-amber-700" : "text-red-700"
                                  )}>
                                    {formatDate(exam.lastDate)}
                                  </p>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-2.5 sm:p-2 min-w-0">
                                  <p className="text-muted-foreground text-[11px] sm:text-xs">Exam date</p>
                                  <p className="font-medium tabular-nums">{formatDate(exam.examDate)}</p>
                                </div>
                              </div>

                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                                {exam.description}
                              </p>

                              {/* Action Buttons — 2×2 on mobile for tap targets + labels */}
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t sm:flex sm:flex-wrap">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-10 w-full sm:flex-1 sm:min-w-[88px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(exam);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5 sm:mr-1 shrink-0" />
                                  <span className="ml-1.5 sm:ml-0 text-xs sm:text-sm">Details</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-10 w-full sm:flex-1 sm:min-w-[88px]"
                                  asChild
                                  disabled={!exam.applyUrl || isClosed}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <a href={exam.applyUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center">
                                    <ExternalLink className="h-3.5 w-3.5 sm:mr-1 shrink-0" />
                                    <span className="ml-1.5 sm:ml-0 text-xs sm:text-sm">Apply</span>
                                  </a>
                                </Button>

                                <Button
                                  size="sm"
                                  variant={exam.saved ? "default" : "outline"}
                                  className="h-10 w-full sm:flex-1 sm:min-w-[88px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveMutation.mutate({ id: exam.id, saved: exam.saved });
                                  }}
                                  disabled={saveMutation.isPending}
                                >
                                  <Bookmark className={cn("h-3.5 w-3.5 sm:mr-1 shrink-0", exam.saved && "fill-current")} />
                                  <span className="ml-1.5 sm:ml-0 text-xs sm:text-sm">{exam.saved ? "Saved" : "Save"}</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant={exam.alertEnabled ? "default" : "outline"}
                                  className="h-10 w-full sm:flex-1 sm:min-w-[88px]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    alertMutation.mutate({ id: exam.id, enabled: exam.alertEnabled });
                                  }}
                                  disabled={alertMutation.isPending}
                                >
                                  <Bell className={cn("h-3.5 w-3.5 sm:mr-1 shrink-0", exam.alertEnabled && "fill-current")} />
                                  <span className="ml-1.5 sm:ml-0 text-xs sm:text-sm">{exam.alertEnabled ? "Alert on" : "Alert"}</span>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Load More */}
                    {listQuery.hasNextPage && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => listQuery.fetchNextPage()}
                          disabled={listQuery.isFetchingNextPage}
                          className="min-w-[160px]"
                        >
                          {listQuery.isFetchingNextPage ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading…
                            </>
                          ) : (
                            "Load More"
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - Upcoming Deadlines */}
          <div className="hidden lg:block space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm">
                  <Clock className="h-4 w-4 text-destructive flex-shrink-0" />
                  Urgent Deadlines
                </h3>
                <div className="space-y-3">
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No upcoming deadlines</p>
                  ) : (
                    upcomingDeadlines.map((exam) => {
                      const daysLeft = daysUntil(exam.lastDate);
                      return (
                        <div
                          key={exam.id}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-colors text-xs",
                            daysLeft !== null && daysLeft <= 3
                              ? "bg-red-50 border border-red-200 hover:bg-red-100"
                              : "bg-amber-50 border border-amber-200 hover:bg-amber-100"
                          )}
                          onClick={() => handleViewDetails(exam)}
                        >
                          <p className="font-medium line-clamp-1">{exam.title}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {exam.type}
                            </Badge>
                            <span className={cn(
                              "font-semibold",
                              daysLeft !== null && daysLeft <= 3 ? "text-red-700" : "text-amber-700"
                            )}>
                              {daysLeft !== null && daysLeft > 0 ? `${daysLeft}d` : "Today"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="border-0 shadow-sm bg-blue-50">
              <CardContent className="p-4">
                <h4 className="font-semibold text-xs mb-3 text-blue-900">Quick Tips</h4>
                <ul className="text-xs text-blue-800 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-base">•</span>
                    <span>Save exams to access them later</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-base">•</span>
                    <span>Enable alerts for important deadlines</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-base">•</span>
                    <span>Check eligibility before applying</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <ExamDetailDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} exam={selectedExam ?? undefined} />
    </AppLayout>
  );
}
