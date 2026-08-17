import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatApi, cloudApi, userApi, type ChatConversationItem, type ChatMessageItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useChatSocket, type ChatWsEvent } from "@/hooks/useChatSocket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import {
  ArrowLeft, Send, Paperclip, Image as ImageIcon, X, FileText,
  Loader2, CheckCheck, Reply, Trash2, Download, MoreVertical, Users, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

/** WhatsApp-style: double tick = every other participant's lastReadAt ≥ message time */
function messageSeenByOthers(
  msg: ChatMessageItem,
  isMine: boolean,
  conv: ChatConversationItem | undefined,
  viewerId: string | undefined,
): boolean {
  if (!isMine || !conv || !viewerId) return false;
  const others = conv.participants.filter(p => p.userId !== viewerId);
  if (others.length === 0) return false;
  const msgT = new Date(msg.createdAt).getTime();
  return others.every(p => {
    if (!p.lastReadAt) return false;
    return new Date(p.lastReadAt).getTime() >= msgT;
  });
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 h-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1 w-1 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 160}ms`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}

export default function ChatThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyboardInset = useKeyboardInset();

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessageItem | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [uploading, setUploading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef(0);

  const { data: convInfo } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => chatApi.listConversations(),
    select: (list) => list.find(c => c.id === conversationId),
  });

  // Messages carry the *sender's* avatar, which for my own messages is absent.
  // Reuse the cached profile so my bubbles show my picture too.
  const { data: myProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: userApi.getProfile,
    enabled: !!user,
  });
  const myAvatarUrl = myProfile?.avatarUrl ?? undefined;
  const myDisplayName =
    myProfile?.fullName ||
    convInfo?.participants.find(p => p.userId === user?.id)?.displayName ||
    "You";

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading,
  } = useInfiniteQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: ({ pageParam }) =>
      chatApi.listMessages(conversationId!, { page: pageParam as number, size: 50 }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.number < last.totalPages - 1 ? last.number + 1 : undefined,
    enabled: !!conversationId,
    refetchInterval: false,
  });

  const allMessages = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(p => p.content).reverse();
  }, [data]);

  const { sendTyping } = useChatSocket({
    onEvent: useCallback((evt: ChatWsEvent) => {
      if (evt.event === "NEW_MESSAGE" && evt.message.conversationId === conversationId) {
        qc.setQueryData(["chat-messages", conversationId], (old: any) => {
          if (!old) return old;
          const firstPage = old.pages[0];
          if (firstPage.content.some((m: ChatMessageItem) => m.id === evt.message.id)) return old;
          return {
            ...old,
            pages: [
              { ...firstPage, content: [evt.message, ...firstPage.content], totalElements: firstPage.totalElements + 1 },
              ...old.pages.slice(1),
            ],
          };
        });
        void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        if (evt.message.senderId !== user?.id) {
          void chatApi.markRead(conversationId!);
        }
      }
      if (evt.event === "TYPING" && evt.conversationId === conversationId && evt.userId !== user?.id) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          const old = next.get(evt.userId);
          if (old) clearTimeout(old);
          next.set(evt.userId, setTimeout(() => {
            setTypingUsers(p => { const n = new Map(p); n.delete(evt.userId); return n; });
          }, 3000));
          return next;
        });
      }
      if (evt.event === "READ_RECEIPT" && evt.conversationId === conversationId) {
        qc.setQueryData(["chat-conversations"], (old: ChatConversationItem[] | undefined) => {
          if (!old) return old;
          return old.map(c => {
            if (c.id !== evt.conversationId) return c;
            return {
              ...c,
              participants: c.participants.map(p =>
                p.userId === evt.userId ? { ...p, lastReadAt: evt.readAt } : p
              ),
            };
          });
        });
      }
    }, [conversationId, qc, user?.id]),
  });

  useEffect(() => {
    if (conversationId) void chatApi.markRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 200);
  }, [allMessages.length > 0 ? allMessages[allMessages.length - 1]?.id : null]);

  const sendTypingThrottled = useCallback(() => {
    if (!conversationId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1600) return;
    lastTypingSentRef.current = now;
    sendTyping(conversationId);
  }, [conversationId, sendTyping]);

  const sendMutation = useMutation({
    mutationFn: (body: Parameters<typeof chatApi.sendMessage>[1]) =>
      chatApi.sendMessage(conversationId!, body),
    onSuccess: (msg) => {
      qc.setQueryData(["chat-messages", conversationId], (old: any) => {
        if (!old) return old;
        const firstPage = old.pages[0];
        if (firstPage.content.some((m: ChatMessageItem) => m.id === msg.id)) return old;
        return {
          ...old,
          pages: [
            { ...firstPage, content: [msg, ...firstPage.content], totalElements: firstPage.totalElements + 1 },
            ...old.pages.slice(1),
          ],
        };
      });
      setText("");
      setReplyTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => chatApi.deleteMessage(messageId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
    },
  });

  const handleSendText = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate({
      content: trimmed,
      type: "TEXT",
      replyToId: replyTo?.id,
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const res = await cloudApi.uploadDocument(file);
      const msgType = file.type.startsWith("image/") ? "IMAGE" : "FILE";
      await chatApi.sendMessage(conversationId!, {
        type: msgType,
        fileUrl: res.url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        content: file.name,
        replyToId: replyTo?.id,
      });
      setReplyTo(null);
      void qc.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
      return;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 2000);
    sendTypingThrottled();
  };

  const convName = convInfo?.name ?? "Chat";
  const otherParticipant = convInfo?.participants.find(p => p.userId !== user?.id);

  const typingSubtitle = useMemo(() => {
    if (typingUsers.size === 0 || !convInfo) return null;
    const names = [...typingUsers.keys()].map((uid) =>
      convInfo.participants.find(p => p.userId === uid)?.displayName ?? "Someone",
    );
    if (names.length === 1) return names[0];
    return `${names.length} people`;
  }, [typingUsers, convInfo]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <header className="flex items-center gap-1.5 px-2 sm:px-3 py-2.5 pt-safe-top border-b bg-card/90 backdrop-blur-md z-10 shrink-0 shadow-sm shadow-black/5">
        <Link
          to="/chat"
          className="p-2.5 rounded-2xl hover:bg-muted active:scale-95 transition shrink-0"
          aria-label="Back to chats"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <button
          type="button"
          className={cn(
            "flex flex-1 min-w-0 items-center gap-3 rounded-2xl py-1.5 pl-1 pr-2 text-left transition-colors",
            "hover:bg-muted/80 active:bg-muted",
          )}
          onClick={() => setDetailsOpen(true)}
        >
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-border/40 shadow-sm">
            <AvatarImage src={convInfo?.avatarUrl ?? undefined} />
            <AvatarFallback className="text-sm font-semibold">{initials(convName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] leading-tight truncate select-text">{convName}</p>
            {typingUsers.size > 0 ? (
              <p className="text-xs text-primary flex items-center gap-1.5 mt-0.5">
                <TypingDots />
                <span className="truncate">
                  {typingUsers.size === 1 ? `${typingSubtitle} is typing` : `${typingSubtitle} are typing`}
                </span>
              </p>
            ) : convInfo?.type === "GROUP" ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                <Users className="h-3 w-3 shrink-0" />
                {convInfo.participants.length} members · tap for details
              </p>
            ) : otherParticipant ? (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Direct chat · tap for details</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Chat</p>
            )}
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 rounded-2xl h-11 w-11" aria-label="Chat options">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={() => setDetailsOpen(true)}>
              <UserCircle className="h-4 w-4 mr-2" />
              Chat details & people
            </DropdownMenuItem>
            {convInfo?.type === "DIRECT" && otherParticipant && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={`/user/${otherParticipant.userId}`} className="cursor-pointer">
                    Open profile
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col min-h-0 h-full max-h-[100dvh] gap-0 p-0"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-border/50 shadow-md">
                <AvatarImage src={convInfo?.avatarUrl ?? undefined} />
                <AvatarFallback className="text-lg">{initials(convName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left space-y-1">
                <SheetTitle className="text-xl pr-8 select-text">{convName}</SheetTitle>
                <SheetDescription className="text-left">
                  {convInfo?.type === "GROUP"
                    ? `${convInfo.participants.length} people in this group`
                    : "Direct message"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 basis-0">
            <div className="px-4 py-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 pb-2">
                People
              </p>
              {convInfo?.participants.map((p) => (
                <Link
                  key={p.userId}
                  to={`/user/${p.userId}`}
                  onClick={() => setDetailsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
                    "hover:bg-muted/80 active:bg-muted border border-transparent hover:border-border/60",
                  )}
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarImage src={p.avatarUrl ?? undefined} />
                    <AvatarFallback>{initials(p.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm truncate select-text">{p.displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate select-all font-mono">
                      {p.userId}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0",
                      p.role === "ADMIN" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.role}
                  </span>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Messages area — abstract layered backdrop (no bitmap) */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {/* Abstract chat backdrop: a soft tinted wash plus a repeating geometric
            motif, drawn in CSS so it costs no image request and adapts to theme. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 15% 0%, hsl(var(--primary) / 0.10) 0%, transparent 55%)," +
                "radial-gradient(100% 70% at 90% 20%, hsl(var(--primary) / 0.06) 0%, transparent 60%)," +
                "linear-gradient(180deg, hsl(var(--muted) / 0.30) 0%, hsl(var(--background)) 70%)",
            }}
          />
          {/* Interlocking diamond lattice — subtle enough to sit behind text. */}
          <div
            className="absolute inset-0 opacity-[0.055] dark:opacity-[0.09]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0 1px, transparent 1px 14px)," +
                "repeating-linear-gradient(-45deg, hsl(var(--foreground)) 0 1px, transparent 1px 14px)",
            }}
          />
          {/* Sparse dots layered over the lattice for depth. */}
          <div
            className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1.1px, transparent 0)",
              backgroundSize: "42px 42px",
            }}
          />
        </div>
        <div className="relative flex-1 overflow-y-auto px-3 sm:px-4 py-3">
        {hasNextPage && (
          <div className="text-center py-2">
            <Button size="sm" variant="ghost" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load older"}
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {allMessages.map((msg, idx) => {
          const isMine = msg.senderId === user?.id;
          const seen = messageSeenByOthers(msg, isMine, convInfo, user?.id);
          const prevMsg = idx > 0 ? allMessages[idx - 1] : null;
          const showDate = !prevMsg || format(new Date(msg.createdAt), "yyyy-MM-dd") !== format(new Date(prevMsg.createdAt), "yyyy-MM-dd");
          // Name label still only leads a new run, in group chats.
          const showSender = !isMine && convInfo?.type === "GROUP" && msg.senderId !== prevMsg?.senderId;
          // Avatars, however, appear on every message on both sides — the
          // sender's own picture is not carried on the message payload, so
          // fall back to the logged-in user's profile photo.
          const avatarUrl = isMine ? myAvatarUrl : msg.senderAvatarUrl ?? undefined;
          const avatarName = isMine ? myDisplayName : msg.senderDisplayName;
          // A bubble rendering only text reserves inline space for the time+ticks.
          const isPlainText =
            msg.deleted || !((msg.type === "IMAGE" || msg.type === "FILE") && msg.fileUrl);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
                  <span className="select-text rounded-full border border-border/60 bg-card/95 px-3.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm backdrop-blur">
                    {format(new Date(msg.createdAt), "MMM d, yyyy")}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
                </div>
              )}
              <div
                className={cn(
                  "flex w-full group gap-2 items-end",
                  isMine ? "justify-end" : "justify-start",
                  // Tight grouping between consecutive messages from one sender.
                  prevMsg && prevMsg.senderId === msg.senderId && !showDate ? "mt-0.5" : "mt-2",
                )}
              >
                {/* Incoming avatar — shown on every message, not just the first
                    of a run, so it is always clear who is speaking. */}
                {!isMine && (
                  <Link
                    to={`/user/${msg.senderId}`}
                    className="mb-0.5 shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-primary/35"
                    title={`${msg.senderDisplayName} — view profile`}
                  >
                    <Avatar className="h-8 w-8 shadow-sm ring-1 ring-border/50">
                      <AvatarImage src={avatarUrl} alt={avatarName} />
                      <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials(avatarName)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                )}

                <div
                  className={cn(
                    "flex flex-col min-w-0 max-w-[min(78vw,24rem)]",
                    isMine ? "items-end" : "items-start",
                  )}
                >
                  {showSender && (
                    <Link
                      to={`/user/${msg.senderId}`}
                      className="text-xs font-semibold text-primary mb-1 pl-1 hover:underline underline-offset-2 select-text"
                    >
                      {msg.senderDisplayName}
                    </Link>
                  )}
                  {/* WhatsApp bubble: hugs its content instead of filling the
                      column, with the tail corner squared off on the sender side. */}
                  <div
                    className={cn(
                      "rounded-[0.5rem] shadow-sm overflow-hidden max-w-full w-fit",
                      isMine
                        ? "bg-[hsl(var(--primary))] text-primary-foreground rounded-tr-none"
                        : "bg-card text-card-foreground border border-border/70 rounded-tl-none shadow-black/5",
                      msg.deleted && "opacity-60 italic",
                    )}
                  >
                    {/* Reply preview */}
                    {msg.replyTo && (
                      <div
                        className={cn(
                          "mx-2 mt-2 mb-1 pl-2.5 pr-2 py-1.5 border-l-[3px] text-xs rounded-md",
                          isMine
                            ? "border-primary-foreground/45 bg-primary-foreground/10 text-primary-foreground/90"
                            : "border-primary/60 bg-muted/80 text-muted-foreground",
                        )}
                      >
                        <p className="font-semibold select-text">{msg.replyTo.senderDisplayName}</p>
                        <p className="truncate select-text">
                          {msg.replyTo.content || (msg.replyTo.type !== "TEXT" ? `[${msg.replyTo.type}]` : "")}
                        </p>
                      </div>
                    )}

                    {msg.deleted ? (
                      <p className="text-[14.5px] leading-[1.35] px-2.5 py-1.5 select-text">
                        This message was deleted
                        <span className="inline-block w-[4.25rem] h-0 align-bottom" aria-hidden />
                      </p>
                    ) : msg.type === "IMAGE" && msg.fileUrl ? (
                      <div className={cn("overflow-hidden", isMine ? "bg-primary-foreground/[0.07]" : "bg-muted/40")}>
                        <button
                          type="button"
                          className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-none"
                          onClick={() => setLightboxUrl(msg.fileUrl!)}
                        >
                          <div className="relative border-b border-border/30 bg-black/[0.02] dark:bg-black/20">
                            <img
                              src={msg.fileUrl}
                              alt={msg.fileName ?? "Shared image"}
                              className="w-full max-h-[min(52vh,20rem)] object-cover object-center"
                              loading="lazy"
                            />
                          </div>
                        </button>
                        {msg.content && msg.content !== msg.fileName && (
                          <p className="text-sm px-3 py-2.5 leading-relaxed select-text">{msg.content}</p>
                        )}
                      </div>
                    ) : msg.type === "FILE" && msg.fileUrl ? (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-3 p-3 m-2 rounded-xl border transition-colors",
                          isMine
                            ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15"
                            : "border-border/80 bg-background/80 hover:bg-muted/60",
                        )}
                      >
                        <div
                          className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                            isMine ? "bg-primary-foreground/15" : "bg-primary/10",
                          )}
                        >
                          <FileText className={cn("h-6 w-6", isMine ? "text-primary-foreground" : "text-primary")} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-semibold truncate select-text">{msg.fileName || "File"}</p>
                          <p className={cn("text-xs", isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {formatBytes(msg.fileSize)}
                          </p>
                        </div>
                        <Download className={cn("h-5 w-5 shrink-0", isMine ? "text-primary-foreground/80" : "text-muted-foreground")} />
                      </a>
                    ) : (
                      /* Text sits in a block with an inline-block spacer sized to
                         the meta row, so a short message keeps the time on the
                         same line and a long one wraps around it — as WhatsApp does. */
                      <p className="text-[14.5px] leading-[1.35] px-2.5 py-1.5 whitespace-pre-wrap break-words select-text">
                        {msg.content}
                        <span className="inline-block w-[4.25rem] h-0 align-bottom" aria-hidden />
                      </p>
                    )}

                    <div
                      className={cn(
                        "flex items-center justify-end gap-1 px-2.5 pb-1.5",
                        // Only plain text reserves inline room for this row, so
                        // only then should it be pulled up onto the last line.
                        isPlainText ? "-mt-3.5" : "pt-0.5",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[10.5px] tabular-nums select-none leading-none",
                          isMine ? "text-primary-foreground/65" : "text-muted-foreground",
                        )}
                      >
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </span>
                      {isMine && (
                        <span className="inline-flex" title={seen ? "Read" : "Delivered"}>
                          <CheckCheck
                            className={cn(
                              "h-[15px] w-[15px] shrink-0",
                              seen
                                ? "text-sky-300 dark:text-sky-300"
                                : "text-primary-foreground/50",
                            )}
                            strokeWidth={2.6}
                          />
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity",
                      isMine ? "justify-end" : "justify-start",
                    )}
                  >
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                      onClick={() => {
                        setReplyTo(msg);
                        inputRef.current?.focus();
                      }}
                      title="Reply"
                    >
                      <Reply className="h-3.5 w-3.5" />
                    </button>
                    {isMine && !msg.deleted && (
                      <button
                        type="button"
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this message?")) deleteMutation.mutate(msg.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Outgoing avatar, mirroring the incoming side. */}
                {isMine && (
                  <Link
                    to="/profile"
                    className="mb-0.5 shrink-0 rounded-full ring-2 ring-transparent transition-all hover:ring-primary/35"
                    title="View your profile"
                  >
                    <Avatar className="h-8 w-8 shadow-sm ring-1 ring-border/50">
                      <AvatarImage src={avatarUrl} alt={avatarName} />
                      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                        {initials(avatarName)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
        </div>
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-t bg-muted/40 backdrop-blur-sm">
          <div className="h-9 w-1 rounded-full bg-primary shrink-0" aria-hidden />
          <Reply className="h-4 w-4 text-primary shrink-0 opacity-80" />
          <div className="flex-1 min-w-0 rounded-xl border border-border/60 bg-card/80 px-3 py-2">
            <p className="text-xs font-semibold text-primary select-text">{replyTo.senderDisplayName}</p>
            <p className="text-xs text-muted-foreground truncate select-text">
              {replyTo.content || (replyTo.type !== "TEXT" ? `[${replyTo.type}]` : "")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="p-2 rounded-xl hover:bg-muted shrink-0"
            aria-label="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input bar — WhatsApp style: one rounded field carrying the attachment
          controls, with the send button as a separate circle beside it. */}
      <div className={cn("flex items-end gap-1.5 px-2 py-2 bg-transparent shrink-0", keyboardInset === 0 && "pb-safe-bottom")}>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt"
          onChange={handleFileSelect}
        />

        <div className="flex flex-1 items-end gap-1 rounded-[1.6rem] border border-border/60 bg-card px-1.5 py-1 shadow-sm">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) sendTypingThrottled();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message"
            rows={1}
            className="flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] outline-none max-h-32 placeholder:text-muted-foreground"
            style={{ minHeight: "38px" }}
          />
          <button
            type="button"
            className="mb-0.5 shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Attach file"
            title="Attach file"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5 -rotate-45" />}
          </button>
          <button
            type="button"
            className="mb-0.5 shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const fakeEvent = { target: { files: [file], value: "" } } as any;
                  handleFileSelect(fakeEvent);
                }
              };
              input.click();
            }}
            disabled={uploading}
            aria-label="Send image"
            title="Send image"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          className={cn(
            "mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95",
            text.trim()
              ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              : "bg-muted text-muted-foreground",
          )}
          onClick={handleSendText}
          disabled={!text.trim() || sendMutation.isPending}
          aria-label="Send message"
        >
          <Send className="h-5 w-5 translate-x-[1px]" />
        </button>
      </div>

      <ImageLightbox
        open={lightboxUrl !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
        media={lightboxUrl ? [{ url: lightboxUrl, type: "IMAGE" }] : []}
      />
    </div>
  );
}
