import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserRound } from "lucide-react";
import { userApi, type UserProfile } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

function profileHref(p: UserProfile): string {
  if (p.profileKey) return `/profile/${encodeURIComponent(p.profileKey)}`;
  return `/user/${p.userId}`;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function FindMembers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const enabled = debouncedQ.length >= 2;

  const infinite = useInfiniteQuery({
    queryKey: ["users", "search", debouncedQ],
    queryFn: ({ pageParam }) =>
      userApi.search(debouncedQ, { page: pageParam as number, size: 20 }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.number < last.totalPages - 1 ? last.number + 1 : undefined,
    enabled,
  });

  const flat = useMemo(
    () => infinite.data?.pages.flatMap((p) => p.content) ?? [],
    [infinite.data?.pages]
  );

  const onPull = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["users", "search"] });
  }, [qc]);

  return (
    <AppLayout title="Find people" pullToRefresh={onPull}>
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">
          Search by name, profile id, email, phone, or full user UUID. Pull down to refresh results.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type at least 2 characters…"
            className="pl-10 rounded-2xl bg-card border-border/70"
            autoComplete="off"
            inputMode="search"
          />
        </div>

        {!enabled && (
          <div className="rounded-2xl border border-dashed bg-muted/20 py-12 text-center text-sm text-muted-foreground">
            <UserRound className="h-10 w-10 mx-auto mb-2 opacity-50" />
            Enter a name, @handle, email, phone, or paste a user id.
          </div>
        )}

        {enabled && infinite.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {enabled && infinite.isError && (
          <p className="text-sm text-destructive text-center py-8">
            {infinite.error instanceof Error ? infinite.error.message : "Search failed"}
          </p>
        )}

        {enabled && !infinite.isLoading && flat.length === 0 && !infinite.isError && (
          <p className="text-sm text-muted-foreground text-center py-8">No members match your search.</p>
        )}

        <div className="space-y-2">
          {flat.map((p) => (
            <Link
              key={p.userId}
              to={profileHref(p)}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 hover:bg-muted/40 transition-colors"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={p.avatarUrl ?? undefined} />
                <AvatarFallback>{initials(p.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.fullName || "Member"}</p>
                {p.profileKey && (
                  <p className="text-xs text-muted-foreground truncate">@{p.profileKey}</p>
                )}
                {(p.city || p.profession) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[p.profession, p.city].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {enabled && infinite.hasNextPage && (
          <Button
            variant="outline"
            className="w-full rounded-2xl"
            disabled={infinite.isFetchingNextPage}
            onClick={() => void infinite.fetchNextPage()}
          >
            {infinite.isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        )}
      </div>
    </AppLayout>
  );
}
