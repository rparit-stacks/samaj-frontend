import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { suggestionsApi, type SuggestionDto, type SuggestionStatus } from "@/lib/api";
import { Lightbulb, Send, Clock, CheckCircle, XCircle, AlertCircle, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "general", label: "General" },
  { id: "events", label: "Events" },
  { id: "facilities", label: "Facilities" },
  { id: "website", label: "Website/App" },
  { id: "community", label: "Community Services" },
];

const statusConfig: Record<
  SuggestionStatus,
  { label: string; icon: typeof Clock; color: string }
> = {
  PENDING: { label: "Pending", icon: Clock, color: "bg-muted text-muted-foreground" },
  UNDER_REVIEW: { label: "Under Review", icon: AlertCircle, color: "bg-amber-100 text-amber-700" },
  ACCEPTED: { label: "Accepted", icon: CheckCircle, color: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-700" },
};

function suggestionStatusUi(status: string) {
  if (status in statusConfig) {
    return statusConfig[status as SuggestionStatus];
  }
  return {
    label: status,
    icon: AlertCircle,
    color: "bg-muted text-muted-foreground",
  };
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Suggestions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SuggestionStatus | "ALL">("ALL");

  const pageSize = 20;

  const listQuery = useInfiniteQuery({
    queryKey: ["suggestions", "me", search.trim() || undefined, status],
    queryFn: ({ pageParam }) =>
      suggestionsApi.listMine({
        page: pageParam as number,
        size: pageSize,
        q: search.trim() || undefined,
        status,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.number + 1;
      return next < lastPage.totalPages ? next : undefined;
    },
  });

  const suggestions = useMemo(() => {
    const pages = listQuery.data?.pages ?? [];
    return pages.flatMap((p) => p.content);
  }, [listQuery.data]);

  const createMutation = useMutation({
    mutationFn: suggestionsApi.create,
    onSuccess: () => {
      toast({ title: "Suggestion submitted", description: "Thanks! You can track status in My Suggestions." });
      setTitle("");
      setDescription("");
      setCategory("");
      queryClient.invalidateQueries({ queryKey: ["suggestions", "me"] });
    },
    onError: (e) => {
      toast({ title: "Failed to submit", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({ title: title.trim(), description: description.trim(), category });
  };

  return (
    <AppLayout title="Suggestions">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Lightbulb className="h-7 w-7 text-secondary" />
            Suggestions
          </h1>
          <p className="text-muted-foreground">Share your ideas to improve our community</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Submit Suggestion Form */}
          <Card className="border-0 shadow-card h-fit">
            <CardHeader>
              <CardTitle>Submit a Suggestion</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Brief title for your suggestion"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your suggestion in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Suggestions List */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-lg font-semibold">My Suggestions</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search suggestions..."
                    className="pl-10"
                  />
                </div>
                <Select value={status} onValueChange={(v) => setStatus(v as SuggestionStatus | "ALL")}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="ACCEPTED">Accepted</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {listQuery.isLoading ? (
              <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Loading…</p>
              </div>
            ) : listQuery.isError ? (
              <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {listQuery.error instanceof Error ? listQuery.error.message : "Failed to load suggestions"}
                </p>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl shadow-card">
                <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">You haven't submitted any suggestions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((suggestion: SuggestionDto) => {
                  const conf = suggestionStatusUi(suggestion.status);
                  const StatusIcon = conf.icon;
                  const categoryLabel =
                    categories.find((c) => c.id === suggestion.category)?.label ?? suggestion.category;
                  
                  return (
                    <div key={suggestion.id} className="bg-card rounded-xl shadow-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium line-clamp-2">{suggestion.title}</h3>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {categoryLabel}
                            </Badge>
                            <Badge className={cn("text-xs gap-1", conf.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {conf.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{suggestion.description}</p>

                      {suggestion.response ? (
                        <div className="mt-3 p-3 rounded-lg bg-muted/50">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {suggestion.status === "REJECTED" ? "Rejection reason:" : "Response:"}
                          </p>
                          <p className="text-sm">{suggestion.response}</p>
                        </div>
                      ) : null}
                      
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Submitted: {formatDate(suggestion.createdAt)}</span>
                        <span>Updated: {formatDate(suggestion.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-center">
                  {listQuery.hasNextPage ? (
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
                        "Load more"
                      )}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">No more results</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
