import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "");

function wsUrl() {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/ws`;
}

export type ChatWsEvent =
  | { event: "NEW_MESSAGE"; message: import("@/lib/api").ChatMessageItem }
  | { event: "TYPING"; conversationId: string; userId: string; displayName: string | null }
  | { event: "READ_RECEIPT"; conversationId: string; userId: string; readAt: string };

interface UseChatSocketOpts {
  onEvent: (evt: ChatWsEvent) => void;
  enabled?: boolean;
}

function publishIfConnected(client: Client | null, destination: string, body: string) {
  if (!client?.connected) return false;
  try {
    client.publish({ destination, body });
    return true;
  } catch {
    return false;
  }
}

export function useChatSocket({ onEvent, enabled = true }: UseChatSocketOpts) {
  const clientRef = useRef<Client | null>(null);
  /** Read receipts requested before STOMP connected; flushed in onConnect / reconnect */
  const pendingReadIdsRef = useRef(new Set<string>());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const flushPendingReads = () => {
      const c = clientRef.current;
      if (!c?.connected) return;
      const ids = Array.from(pendingReadIdsRef.current);
      pendingReadIdsRef.current.clear();
      for (const conversationId of ids) {
        publishIfConnected(c, `/app/chat/${conversationId}/read`, "{}");
      }
    };

    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        client.subscribe("/user/queue/chat", (frame) => {
          try {
            const data = JSON.parse(frame.body);
            onEventRef.current(data as ChatWsEvent);
          } catch { /* ignore parse errors */ }
        });
        flushPendingReads();
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [enabled]);

  const sendTyping = useCallback((conversationId: string) => {
    publishIfConnected(
      clientRef.current,
      `/app/chat/${conversationId}/typing`,
      "{}",
    );
  }, []);

  const sendReadWs = useCallback((conversationId: string) => {
    const ok = publishIfConnected(
      clientRef.current,
      `/app/chat/${conversationId}/read`,
      "{}",
    );
    if (!ok) pendingReadIdsRef.current.add(conversationId);
  }, []);

  const client = clientRef.current;
  return { sendTyping, sendReadWs, connected: !!client?.connected };
}
