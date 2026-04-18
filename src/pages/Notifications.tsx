import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, Newspaper, AlertTriangle, CheckCircle, Clock, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi, type NotificationDto } from "@/lib/api";

const typeConfig = {
  info: { icon: Newspaper, color: "bg-blue-500/10 text-blue-600" },
  emergency: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  system: { icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-700" },
} as const;

function formatNotificationTime(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => notificationApi.getNotifications({ page: 0, size: 100 }),
  });
  const notifications = data?.content ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllReadMutation = useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: notificationApi.clearAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unreadCount"] });
    },
  });

  const filterNotifications = (tab: "all" | "info" | "emergency" | "system") => {
    if (tab === "all") return notifications;
    if (tab === "emergency") return notifications.filter((n) => n.type === "SECURITY" || n.type === "ALERT");
    if (tab === "system") return notifications.filter((n) => n.type === "SYSTEM");
    return notifications.filter((n) => n.type === "INFO");
  };

  return (
    <AppLayout title="Notifications">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Bell className="h-7 w-7 text-primary" />
              Notifications
            </h1>
            <p className="text-muted-foreground">Stay updated with community activity</p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteAllMutation.mutate()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="all" className="gap-1">
              All
              {unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-xs ml-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {(["all", "info", "emergency", "system"] as const).map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-6">
              <div className="bg-card rounded-2xl shadow-card overflow-hidden divide-y divide-border">
                {filterNotifications(tabValue).length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  filterNotifications(tabValue).map((notification: NotificationDto) => {
                    const configKey =
                      notification.type === "SECURITY" || notification.type === "ALERT"
                        ? "emergency"
                        : notification.type === "SYSTEM"
                          ? "system"
                          : "info";
                    const config = typeConfig[configKey];
                    const Icon = config.icon;

                    const linkTo = notification.link?.trim() || "/notifications";
                    return (
                      <Link
                        key={notification.id}
                        to={linkTo}
                        onClick={() => {
                          if (!notification.read) markReadMutation.mutate(notification.id);
                        }}
                        className={cn(
                          "flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors",
                          !notification.read && "bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                          config.color
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "font-medium text-sm",
                                !notification.read && "text-foreground",
                                notification.read && "text-muted-foreground"
                              )}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                {notification.body}
                              </p>
                            </div>
                            {!notification.read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
