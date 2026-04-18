import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MatrimonyLayout } from "@/components/layout/MatrimonyLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, MessageCircle, ChevronRight } from "lucide-react";
import { matrimonyApi } from "@/lib/api";

function ChatListRow({ conversationId, otherProfileId }: { conversationId: string; otherProfileId: string }) {
  const { data: p, isLoading } = useQuery({
    queryKey: ["matrimony-profile", otherProfileId],
    queryFn: () => matrimonyApi.getProfile(otherProfileId),
    enabled: !!otherProfileId,
  });
  return (
    <Link to={`/matrimony/chats/${conversationId}`}>
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:bg-muted/50 transition-colors">
        <div className="min-w-0">
          <p className="font-medium truncate">{isLoading ? "…" : p?.displayName ?? "Profile"}</p>
          <p className="text-xs text-muted-foreground truncate">{p?.city ?? ""}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}

export default function MatrimonyChats() {
  const { data: summary } = useQuery({
    queryKey: ["matrimony-me"],
    queryFn: () => matrimonyApi.meSummary(),
  });

  const myProfileIds = new Set((summary?.profiles ?? []).map((p) => p.id));

  const { data: conversations, isLoading, error } = useQuery({
    queryKey: ["matrimony-conversations"],
    queryFn: () => matrimonyApi.listConversations(),
    enabled: summary?.canBrowse === true,
  });

  return (
    <MatrimonyLayout title="Matrimony chats">
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Link to="/matrimony">
            <Button variant="ghost" size="sm" className="gap-2 -ml-2">
              <ChevronLeft className="h-4 w-4" />
              Matrimony
            </Button>
          </Link>
          <Link to="/matrimony/dashboard">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>

        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-pink-500" />
          Chats
        </h1>
        <p className="text-sm text-muted-foreground">Separate from main Samaj chat.</p>

        {summary && !summary.canBrowse && (
          <p className="text-sm text-muted-foreground rounded-xl border p-4">
            Activate a matrimony profile to use matrimony messaging.
          </p>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm">{(error as Error).message}</p>
        )}

        <ul className="space-y-2">
          {(conversations ?? []).map((c) => {
            const otherId = myProfileIds.has(c.profileIdLower) ? c.profileIdHigher : c.profileIdLower;
            return (
              <li key={c.id}>
                <ChatListRow conversationId={c.id} otherProfileId={otherId} />
              </li>
            );
          })}
        </ul>

        {!isLoading && conversations?.length === 0 && summary?.canBrowse && (
          <p className="text-center text-muted-foreground py-8 text-sm">No conversations yet. Open chat from a profile.</p>
        )}
      </div>
    </MatrimonyLayout>
  );
}
