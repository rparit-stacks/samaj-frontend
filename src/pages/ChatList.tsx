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
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  MessageSquare, Search, Plus, Users, Loader2, RefreshCw, UserRound, ChevronDown,
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
    return conversations.filter(c =>
      (c.name ?? "").toLowerCase().includes(q) ||
      c.participants.some(p => p.displayName.toLowerCase().includes(q))
    );
  }, [conversations, search]);

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
      <div className="flex-1 flex flex-col min-w-0">
        <DesktopHeader />
        <MobileHeader title="Chat" />

        <main className="flex-1 pb-20 md:pb-0">
          <div className="max-w-2xl mx-auto p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-primary" />
                  Chat
                  {totalUnread > 0 && (
                    <Badge variant="destructive" className="ml-1">{totalUnread}</Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">Chat with community members</p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5" asChild>
                  <Link to="/find-members">
                    <UserRound className="h-4 w-4" />
                    <span className="hidden sm:inline">Find</span>
                  </Link>
                </Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" className="bg-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>New chat</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-1 overflow-y-auto flex-1 min-h-0">
                      <Button variant="outline" className="w-full rounded-xl gap-2 justify-start" asChild>
                        <Link to="/find-members" onClick={() => setDialogOpen(false)}>
                          <UserRound className="h-4 w-4" />
                          Open Find people (full screen)
                        </Link>
                      </Button>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Search members</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Name, @id, email, phone, UUID…"
                            className="pl-9 rounded-xl"
                            value={userPickQ}
                            onChange={(e) => setUserPickQ(e.target.value)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">At least 2 characters.</p>
                      </div>
                      <div className="rounded-xl border border-border/60 divide-y max-h-48 overflow-y-auto">
                        {pickEnabled && memberSearch.isLoading && (
                          <div className="p-4 flex justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          </div>
                        )}
                        {pickEnabled &&
                          !memberSearch.isLoading &&
                          (memberSearch.data?.content.length ?? 0) === 0 && (
                            <p className="p-3 text-sm text-muted-foreground text-center">No matches</p>
                          )}
                        {(memberSearch.data?.content ?? []).map((m) => (
                          <button
                            key={m.userId}
                            type="button"
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                            onClick={() => void startChatWithUser(m)}
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={m.avatarUrl ?? undefined} />
                              <AvatarFallback>{initials(m.fullName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{m.fullName || "Member"}</p>
                              {m.profileKey && (
                                <p className="text-xs text-muted-foreground truncate">@{m.profileKey}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground py-1"
                        onClick={() => setShowUuidPaste((v) => !v)}
                      >
                        Paste user UUID instead
                        <ChevronDown className={cn("h-4 w-4 transition-transform", showUuidPaste && "rotate-180")} />
                      </button>
                      {showUuidPaste && (
                        <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                          <Input
                            placeholder="00000000-0000-0000-0000-000000000000"
                            value={newChatUserId}
                            onChange={(e) => setNewChatUserId(e.target.value)}
                          />
                          <Button className="w-full rounded-xl" onClick={() => void handleNewDirect()} disabled={!newChatUserId.trim()}>
                            Start chat
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2 justify-end pt-1">
                        <DialogClose asChild>
                          <Button variant="outline">Close</Button>
                        </DialogClose>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations…"
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Conversation List */}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <p className="text-destructive">Could not load chats</p>
                <Button variant="outline" className="mt-3" onClick={() => refetch()}>Retry</Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground font-medium">
                  {search ? "No conversations match your search" : "No chats yet"}
                </p>
                {!search && (
                  <p className="text-sm text-muted-foreground">
                    Start a new chat using the + button above
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border rounded-2xl border bg-card shadow-sm overflow-hidden">
                {filtered.map(conv => (
                  <ConversationRow key={conv.id} conv={conv} currentUserId={user?.id} />
                ))}
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
  const otherParticipant = conv.participants.find(p => p.userId !== currentUserId);

  return (
    <Link
      to={`/chat/${conv.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={conv.avatarUrl ?? undefined} />
          <AvatarFallback className={isGroup ? "bg-primary/10" : ""}>
            {isGroup ? <Users className="h-5 w-5" /> : initials(conv.name ?? otherParticipant?.displayName)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`font-semibold truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-foreground/80"}`}>
            {conv.name ?? otherParticipant?.displayName ?? "Chat"}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {timeAgo(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-sm truncate ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {conv.lastMessagePreview || "No messages yet"}
          </p>
          {conv.unreadCount > 0 && (
            <Badge className="ml-2 bg-primary text-primary-foreground h-5 min-w-[20px] flex items-center justify-center text-xs rounded-full">
              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
