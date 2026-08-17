import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { useQueryClient } from "@tanstack/react-query";
import type { NotificationDto } from "@/lib/api";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "");

function wsUrl() {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/ws`;
}

type WsNotificationEvent = {
  event: "NEW_NOTIFICATION";
  notification: NotificationDto;
};

/**
 * Subscribes to /user/queue/notifications via STOMP and keeps React Query
 * caches in sync so the bell badge and notification list update in real time.
 * Call once at the layout level when the user is authenticated.
 */
export function useNotificationSocket(enabled: boolean) {
  const queryClient = useQueryClient();
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 30000,
      heartbeatOutgoing: 30000,
      onConnect: () => {
        client.subscribe("/user/queue/notifications", (frame) => {
          try {
            const data = JSON.parse(frame.body) as WsNotificationEvent;
            if (data.event !== "NEW_NOTIFICATION") return;

            // Bump the unread count immediately without a round-trip
            queryClient.setQueryData<{ unread: number }>(
              ["notifications", "unreadCount"],
              (prev) => ({ unread: (prev?.unread ?? 0) + 1 }),
            );

            // Prepend into the cached list, skipping duplicates (the REST poll
            // and this push can race and deliver the same notification twice).
            queryClient.setQueryData<{ content: NotificationDto[]; totalElements: number }>(
              ["notifications", "list"],
              (prev) => {
                if (!prev) return prev;
                if (prev.content.some((n) => n.id === data.notification.id)) return prev;
                return {
                  ...prev,
                  content: [data.notification, ...prev.content],
                  totalElements: prev.totalElements + 1,
                };
              },
            );

            // Person-to-person notifications also change other screens, so
            // refresh the lists they render rather than waiting for a poll.
            const type = (data.notification.type ?? "").toUpperCase();
            if (type === "CONTACT_REQUEST") {
              void queryClient.invalidateQueries({ queryKey: ["contactRequests"] });
              void queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
            }
          } catch {
            // Fallback: just invalidate so the next poll fetches fresh data
            void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }
        });
      },
      onWebSocketError: () => {
        // Connection trouble: fall back to refetching so the bell is not stale.
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [enabled, queryClient]);
}
