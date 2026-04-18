import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { achieversApi, type AchievementDetailDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trophy, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

function AchievementRow({ a }: { a: AchievementDetailDto }) {
  const statusColor =
    a.status === "APPROVED"
      ? "bg-emerald-500/10 text-emerald-700"
      : a.status === "PENDING"
        ? "bg-amber-500/10 text-amber-800"
        : "bg-red-500/10 text-red-700";

  return (
    <Link
      to={`/achievements/${a.id}`}
      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 hover:bg-muted/40 transition-colors"
    >
      <div className="h-11 w-11 rounded-full bg-primary/10 overflow-hidden flex-shrink-0">
        {a.userAvatarUrl ? (
          <img src={a.userAvatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-primary text-sm font-semibold">
            {(a.userName || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground line-clamp-1">{a.headline}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{a.userName}</p>
      </div>
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor}`}>{a.status}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}

export default function AchievementsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "mine" ? "mine" : "approved";
  const [tab, setTab] = useState<"approved" | "mine">(tabFromUrl);

  useEffect(() => {
    setTab(tabFromUrl);
  }, [tabFromUrl]);

  const onTabChange = (v: string) => {
    const next = v as "approved" | "mine";
    setTab(next);
    setSearchParams(next === "mine" ? { tab: "mine" } : {}, { replace: true });
  };

  const approvedQuery = useQuery({
    queryKey: ["achievers", "list", "approved"],
    queryFn: () => achieversApi.list({ view: "approved", page: 0, size: 50 }),
  });

  const mineQuery = useQuery({
    queryKey: ["achievers", "list", "mine"],
    queryFn: () => achieversApi.list({ view: "mine", page: 0, size: 50 }),
  });

  return (
    <AppLayout title="Achievers">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-600" />
              Achievers
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recognize excellence — browse community achievements or manage your submissions.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-full shrink-0">
            <Link to="/achievements/new" className="gap-1">
              <Plus className="h-4 w-4" />
              Add
            </Link>
          </Button>
        </div>

        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="approved">Community</TabsTrigger>
            <TabsTrigger value="mine">My submissions</TabsTrigger>
          </TabsList>
          <TabsContent value="approved" className="mt-4 space-y-3">
            {approvedQuery.isLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (approvedQuery.data?.content ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">No published achievements yet.</p>
            ) : (
              approvedQuery.data!.content.map((a) => <AchievementRow key={a.id} a={a} />)
            )}
          </TabsContent>
          <TabsContent value="mine" className="mt-4 space-y-3">
            {mineQuery.isLoading ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (mineQuery.data?.content ?? []).length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">You have not submitted an achievement yet.</p>
            ) : (
              mineQuery.data!.content.map((a) => <AchievementRow key={a.id} a={a} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
