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

            // Prepend the new notification into the cached list if it's loaded
            queryClient.setQueryData<{ content: NotificationDto[]; totalElements: number }>(
              ["notifications", "list"],
              (prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  content: [data.notification, ...prev.content],
                  totalElements: prev.totalElements + 1,
                };
              },
            );
          } catch {
            // Fallback: just invalidate so the next poll fetches fresh data
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }
        });
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
