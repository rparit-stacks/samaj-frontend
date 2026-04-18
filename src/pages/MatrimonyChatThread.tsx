import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MatrimonyLayout } from "@/components/layout/MatrimonyLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, Send } from "lucide-react";
import { matrimonyApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function MatrimonyChatThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: summary } = useQuery({
    queryKey: ["matrimony-me"],
    queryFn: () => matrimonyApi.meSummary(),
  });

  const myProfileIds = useMemo(() => new Set((summary?.profiles ?? []).map((p) => p.id)), [summary?.profiles]);
  const activeFromId = summary?.profiles.find((p) => p.status === "ACTIVE")?.id ?? "";

  const { data: conversations } = useQuery({
    queryKey: ["matrimony-conversations"],
    queryFn: () => matrimonyApi.listConversations(),
    enabled: !!conversationId,
  });

  const conv = conversations?.find((c) => c.id === conversationId);
  const otherProfileId = conv
    ? myProfileIds.has(conv.profileIdLower)
      ? conv.profileIdHigher
      : conv.profileIdLower
    : "";

  const { data: otherProfile } = useQuery({
    queryKey: ["matrimony-profile", otherProfileId],
    queryFn: () => matrimonyApi.getProfile(otherProfileId),
    enabled: !!otherProfileId,
  });

  const { data: page, isLoading } = useQuery({
    queryKey: ["matrimony-messages", conversationId],
    queryFn: () => matrimonyApi.listMessages(conversationId!, { page: 0, size: 100 }),
    enabled: !!conversationId,
  });

  const messages = useMemo(() => {
    const c = page?.content ?? [];
    return [...c].reverse();
  }, [page?.content]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: () =>
      matrimonyApi.sendMessage(conversationId!, {
        senderProfileId: activeFromId,
        content: text.trim(),
      }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["matrimony-messages", conversationId] });
    },
    onError: (e: Error) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  if (!conversationId) return null;

  return (
    <MatrimonyLayout title={otherProfile?.displayName ?? "Chat"}>
      <div className="flex flex-col h-[calc(100dvh-8rem)] max-w-lg mx-auto px-4 md:px-6">
        <div className="flex items-center gap-2 py-3 border-b shrink-0">
          <Link to="/matrimony/chats">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <p className="font-semibold truncate">{otherProfile?.displayName ?? "…"}</p>
            <p className="text-xs text-muted-foreground">Matrimony chat</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {messages.map((m) => {
            const mine = myProfileIds.has(m.senderProfileId);
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-pink-600 text-white" : "bg-muted"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex gap-2 py-3 border-t shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim() || !activeFromId || sendMutation.isPending) return;
            sendMutation.mutate();
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={activeFromId ? "Message…" : "No active profile"}
            disabled={!activeFromId}
          />
          <Button type="submit" size="icon" disabled={!activeFromId || !text.trim() || sendMutation.isPending}>
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </MatrimonyLayout>
  );
}
