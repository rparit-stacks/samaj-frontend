import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { chatApi, userApi, type ChatConversationItem, type UserProfile } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAuth } from "@/context/AuthContext";
import { useChatSocket, type ChatWsEvent } from "@/hooks/useChatSocket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  MessageSquare, Search, Plus, Users, Loader2, RefreshCw, UserRound, ChevronDown, X,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { DesktopHeader } from "@/components/layout/DesktopHeader";

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: false });
  } catch {
    return "";
  }
}

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newChatUserId, setNewChatUserId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userPickQ, setUserPickQ] = useState("");
  const [showUuidPaste, setShowUuidPaste] = useState(false);
  const debouncedPick = useDebouncedValue(userPickQ.trim(), 300);
  const pickEnabled = debouncedPick.length >= 2;

  useEffect(() => {
    if (!dialogOpen) {
      setUserPickQ("");
      setNewChatUserId("");
      setShowUuidPaste(false);
    }
  }, [dialogOpen]);

  const memberSearch = useQuery({
    queryKey: ["users", "search", "chatPicker", debouncedPick],
    queryFn: () => userApi.search(debouncedPick, { page: 0, size: 15 }),
    enabled: dialogOpen && pickEnabled,
  });

  const { data: conversations, isLoading, isError, refetch } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => chatApi.listConversations(),
    refetchInterval: 15000,
  });

  useChatSocket({
    onEvent: (evt: ChatWsEvent) => {
      if (evt.event === "NEW_MESSAGE" || evt.event === "READ_RECEIPT") {
        void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      }
    },
  });

  const filtered = useMemo(() => {
    if (!conversations) return [];
    const q = search.toLowerCase().trim();
    if (!q) return conversations;
    // Match the chat title, any participant, and the last message preview so
    // searching for something you remember saying finds the conversation.
    return conversations.filter(c =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.lastMessagePreview ?? "").toLowerCase().includes(q) ||
      c.participants.some(p => p.displayName.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  // When the query matches nobody you already talk to, offer matching members
  // so a new chat can be started without opening the "New message" dialog.
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const inlineMemberSearch = useQuery({
    queryKey: ["users", "search", "chatInline", debouncedSearch],
    queryFn: () => userApi.search(debouncedSearch, { page: 0, size: 10 }),
    enabled: debouncedSearch.length >= 2,
  });

  const existingIds = useMemo(
    () => new Set((conversations ?? []).flatMap(c => c.participants.map(p => p.userId))),
    [conversations],
  );
  const memberSuggestions = useMemo(() => {
    if (debouncedSearch.length < 2) return [];
    return (inlineMemberSearch.data?.content ?? []).filter(
      m => m.userId !== user?.id && !existingIds.has(m.userId),
    );
  }, [inlineMemberSearch.data, existingIds, user?.id, debouncedSearch]);

  const totalUnread = useMemo(() =>
    (conversations ?? []).reduce((sum, c) => sum + c.unreadCount, 0), [conversations]);

  const handleNewDirect = async () => {
    if (!newChatUserId.trim()) return;
    try {
      const conv = await chatApi.openDirect(newChatUserId.trim());
      setDialogOpen(false);
      setNewChatUserId("");
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      navigate(`/chat/${conv.id}`);
    } catch (e: any) {
      alert(e.message || "Could not start chat");
    }
  };

  const startChatWithUser = async (member: UserProfile) => {
    if (member.userId === user?.id) {
      alert("You cannot chat with yourself.");
      return;
    }
    try {
      const conv = await chatApi.openDirect(member.userId);
      setDialogOpen(false);
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      navigate(`/chat/${conv.id}`);
    } catch (e: any) {
      alert(e.message || "Could not start chat");
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DesktopSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex flex-1 flex-col min-w-0">
        <div className="native-status-inset md:hidden" aria-hidden />
        <DesktopHeader />
        <MobileHeader title="Messages" />

        <main className="flex-1 pb-nav-safe md:pb-0">
          <div className="mx-auto max-w-lg">
            {/* Top bar */}
            <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight">Messages</h1>
                  {totalUnread > 0 && (
                    <p className="text-xs text-muted-foreground">{totalUnread} unread</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={() => void refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" asChild>
                    <Link to="/find-members">
                      <UserRound className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" className="h-9 w-9 rounded-full">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>New message</DialogTitle>
                      </DialogHeader>
                      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pt-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search people…"
                            className="rounded-full pl-9"
                            value={userPickQ}
                            onChange={(e) => setUserPickQ(e.target.value)}
                          />
                        </div>
                        <div className="divide-y overflow-hidden rounded-2xl border border-border/60">
                          {pickEnabled && memberSearch.isLoading && (
                            <div className="flex justify-center p-4">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            </div>
                          )}
                          {pickEnabled &&
                            !memberSearch.isLoading &&
                            (memberSearch.data?.content.length ?? 0) === 0 && (
                              <p className="p-4 text-center text-sm text-muted-foreground">No matches</p>
                            )}
                          {(memberSearch.data?.content ?? []).map((m) => (
                            <button
                              key={m.userId}
                              type="button"
                              className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
                              onClick={() => void startChatWithUser(m)}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={m.avatarUrl ?? undefined} />
                                <AvatarFallback>{initials(m.fullName)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">{m.fullName || "Member"}</p>
                                {m.profileKey && (
                                  <p className="truncate text-xs text-muted-foreground">@{m.profileKey}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between py-1 text-xs font-medium text-muted-foreground"
                          onClick={() => setShowUuidPaste((v) => !v)}
                        >
                          Paste user UUID
                          <ChevronDown className={cn("h-4 w-4 transition-transform", showUuidPaste && "rotate-180")} />
                        </button>
                        {showUuidPaste && (
                          <div className="space-y-2 rounded-2xl border bg-muted/20 p-3">
                            <Input
                              placeholder="00000000-0000-0000-0000-000000000000"
                              value={newChatUserId}
                              onChange={(e) => setNewChatUserId(e.target.value)}
                            />
                            <Button className="w-full rounded-full" onClick={() => void handleNewDirect()} disabled={!newChatUserId.trim()}>
                              Start chat
                            </Button>
                          </div>
                        )}
                        <DialogClose asChild>
                          <Button variant="outline" className="w-full rounded-full">
                            Close
                          </Button>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search chats and people"
                  className="h-10 rounded-full border-0 bg-muted/60 pl-9 pr-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-1 px-2 py-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-3">
                    <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-1/3 animate-pulse rounded-full bg-muted" />
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="py-16 text-center">
                <p className="text-destructive">Could not load chats</p>
                <Button variant="outline" className="mt-3 rounded-full" onClick={() => void refetch()}>
                  Retry
                </Button>
              </div>
            ) : filtered.length === 0 && memberSuggestions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-foreground">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold">{search ? "No results found" : "Your messages"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {search
                      ? inlineMemberSearch.isLoading
                        ? "Searching…"
                        : "No chats or people match that name."
                      : "Send a message to start a chat."}
                  </p>
                </div>
                {!search && (
                  <Button className="mt-1 rounded-full" onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    New message
                  </Button>
                )}
              </div>
            ) : (
              <div>
                {filtered.map((conv) => (
                  <ConversationRow key={conv.id} conv={conv} currentUserId={user?.id} />
                ))}

                {memberSuggestions.length > 0 && (
                  <>
                    <p className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Other people
                    </p>
                    {memberSuggestions.map((m) => (
                      <button
                        key={m.userId}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                        onClick={() => void startChatWithUser(m)}
                      >
                        <Avatar className="h-14 w-14 shrink-0">
                          <AvatarImage src={m.avatarUrl ?? undefined} />
                          <AvatarFallback className="bg-muted">{initials(m.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 border-b border-border/40 py-2.5">
                          <p className="truncate text-[15px] font-semibold">{m.fullName || "Member"}</p>
                          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                            {m.profileKey ? `@${m.profileKey}` : "Tap to start a chat"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}

function ConversationRow({ conv, currentUserId }: { conv: ChatConversationItem; currentUserId?: string }) {
  const isGroup = conv.type === "GROUP";
  const otherParticipant = conv.participants.find((p) => p.userId !== currentUserId);
  const unread = conv.unreadCount > 0;

  return (
    <Link
      to={`/chat/${conv.id}`}
      className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40 active:bg-muted/60"
    >
      <Avatar className="h-14 w-14 shrink-0">
        <AvatarImage src={conv.avatarUrl ?? otherParticipant?.avatarUrl ?? undefined} />
        <AvatarFallback className={isGroup ? "bg-primary/10 text-primary" : "bg-muted"}>
          {isGroup ? <Users className="h-5 w-5" /> : initials(conv.name ?? otherParticipant?.displayName ?? null)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 border-b border-border/40 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn("truncate text-[15px]", unread ? "font-bold" : "font-semibold")}>
            {conv.name ?? otherParticipant?.displayName ?? "Chat"}
          </p>
          <span className={cn("shrink-0 text-[11px]", unread ? "font-semibold text-primary" : "text-muted-foreground")}>
            {timeAgo(conv.lastMessageAt)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn("truncate text-[13px]", unread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {conv.lastMessagePreview || "No messages yet"}
          </p>
          {unread && (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
