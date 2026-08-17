import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell, Newspaper, AlertTriangle, CheckCircle, Clock, Trash2, Briefcase,
  Settings2, Users, Calendar, Image, Megaphone, Trophy, UserPlus, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi, type NotificationDto, type NotificationPreferences } from "@/lib/api";

/** Per-type icon + colour so each notification is recognisable at a glance. */
const TYPE_STYLES: Record<string, { icon: typeof Bell; color: string }> = {
  CONTACT_REQUEST: { icon: UserPlus, color: "bg-pink-500/10 text-pink-600" },
  COMMUNITY: { icon: Users, color: "bg-blue-500/10 text-blue-600" },
  EVENT: { icon: Calendar, color: "bg-amber-500/10 text-amber-600" },
  NEWS: { icon: Newspaper, color: "bg-sky-500/10 text-sky-600" },
  ALERT: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  SECURITY: { icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
  SYSTEM: { icon: Megaphone, color: "bg-emerald-500/10 text-emerald-700" },
  JOB: { icon: Briefcase, color: "bg-violet-500/10 text-violet-700" },
  ACHIEVEMENT: { icon: Trophy, color: "bg-yellow-500/10 text-yellow-600" },
  INFO: { icon: Image, color: "bg-teal-500/10 text-teal-600" },
  MESSAGE: { icon: MessageSquare, color: "bg-indigo-500/10 text-indigo-600" },
};

const FALLBACK_STYLE = { icon: Bell, color: "bg-muted text-muted-foreground" };

const NOTIFICATION_TABS = [
  { value: "all", label: "All" },
  { value: "people", label: "People" },
  { value: "community", label: "Community" },
  { value: "emergency", label: "Emergency" },
  { value: "system", label: "System" },
] as const;

function styleForType(rawType: string | null | undefined) {
  const t = (rawType ?? "").toUpperCase();
  if (TYPE_STYLES[t]) return TYPE_STYLES[t];
  // Types are free-form strings on the backend; match known prefixes too.
  const prefix = Object.keys(TYPE_STYLES).find((k) => t.startsWith(k));
  return prefix ? TYPE_STYLES[prefix] : FALLBACK_STYLE;
}

/** Tab -> which types belong in it. */
const TAB_FILTERS: Record<string, (t: string) => boolean> = {
  all: () => true,
  people: (t) => t === "CONTACT_REQUEST" || t === "MESSAGE",
  community: (t) =>
    t === "COMMUNITY" || t === "EVENT" || t === "NEWS" || t === "ACHIEVEMENT" || t === "INFO",
  emergency: (t) => t === "ALERT" || t === "SECURITY",
  system: (t) => t === "SYSTEM" || t.startsWith("JOB"),
};

const NOTIFICATION_TYPES = [
  { key: "CONTACT_REQUEST", label: "Contact Requests", desc: "When someone wants to connect", icon: UserPlus },
  { key: "COMMUNITY", label: "Community Posts", desc: "New posts from community members", icon: Users },
  { key: "EVENT",     label: "Events",          desc: "New events created by members",    icon: Calendar },
  { key: "NEWS",      label: "News & Articles",  desc: "Published news articles",          icon: Newspaper },
  { key: "ALERT",     label: "Emergency Alerts", desc: "High-priority emergency alerts",   icon: AlertTriangle },
  { key: "INFO",      label: "Gallery & Docs",   desc: "New gallery albums and documents", icon: Image },
  { key: "SYSTEM",    label: "System Messages",  desc: "Admin announcements",              icon: Megaphone },
  { key: "JOB",       label: "Jobs",             desc: "New job postings",                 icon: Briefcase },
  { key: "ACHIEVEMENT", label: "Achievements",   desc: "Community milestone updates",      icon: Trophy },
] as const;

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

  const { data: prefs } = useQuery({
    queryKey: ["notifications", "preferences"],
    queryFn: notificationApi.getPreferences,
  });

  const prefsMutation = useMutation({
    mutationFn: (body: NotificationPreferences) => notificationApi.updatePreferences(body),
    onSuccess: (updated) => {
      queryClient.setQueryData(["notifications", "preferences"], updated);
    },
  });

  function toggleGlobal(field: "emailEnabled" | "inAppEnabled") {
    if (!prefs) return;
    prefsMutation.mutate({ ...prefs, [field]: !prefs[field] });
  }

  function toggleType(typeKey: string) {
    if (!prefs) return;
    const current = new Set(prefs.disabledTypes ?? []);
    if (current.has(typeKey)) {
      current.delete(typeKey);
    } else {
      current.add(typeKey);
    }
    prefsMutation.mutate({ ...prefs, disabledTypes: Array.from(current) });
  }

  const filterNotifications = (tab: string) => {
    const match = TAB_FILTERS[tab] ?? TAB_FILTERS.all;
    return notifications.filter((n) => match((n.type ?? "").toUpperCase()));
  };

  /** Unread count per tab, so each tab can show its own badge. */
  const unreadFor = (tab: string) => filterNotifications(tab).filter((n) => !n.read).length;

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
            {NOTIFICATION_TABS.map(({ value, label }) => {
              const count = unreadFor(value);
              return (
                <TabsTrigger key={value} value={value} className="gap-1">
                  {label}
                  {count > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-xs ml-1">{count}</Badge>
                  )}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="preferences" className="gap-1">
              <Settings2 className="h-3.5 w-3.5" />
              Preferences
            </TabsTrigger>
          </TabsList>

          {NOTIFICATION_TABS.map(({ value: tabValue }) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-6">
              <div className="bg-card rounded-2xl shadow-card overflow-hidden divide-y divide-border">
                {filterNotifications(tabValue).length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {tabValue === "all"
                        ? "No notifications yet"
                        : "Nothing here yet"}
                    </p>
                  </div>
                ) : (
                  filterNotifications(tabValue).map((notification: NotificationDto) => {
                    const config = styleForType(notification.type);
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
          {/* Preferences panel */}
          <TabsContent value="preferences" className="mt-6 space-y-6">
            {/* Global toggles */}
            <div className="bg-card rounded-2xl shadow-card p-5 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Global Settings
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toggle-inapp" className="font-medium">In-App Notifications</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show notifications inside the web app
                  </p>
                </div>
                <Switch
                  id="toggle-inapp"
                  checked={prefs?.inAppEnabled ?? true}
                  onCheckedChange={() => toggleGlobal("inAppEnabled")}
                  disabled={prefsMutation.isPending}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="toggle-email" className="font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive email digests and alerts
                  </p>
                </div>
                <Switch
                  id="toggle-email"
                  checked={prefs?.emailEnabled ?? true}
                  onCheckedChange={() => toggleGlobal("emailEnabled")}
                  disabled={prefsMutation.isPending}
                />
              </div>
            </div>

            {/* Per-type toggles */}
            <div className="bg-card rounded-2xl shadow-card p-5 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Notification Types
              </h2>
              <p className="text-xs text-muted-foreground -mt-2">
                Turn off types you don't want to receive.
              </p>
              <div className="divide-y divide-border">
                {NOTIFICATION_TYPES.map(({ key, label, desc, icon: Icon }) => {
                  const disabled = prefs?.disabledTypes?.includes(key) ?? false;
                  return (
                    <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          key === "ALERT"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <Label htmlFor={`toggle-${key}`} className="font-medium cursor-pointer">
                            {label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <Switch
                        id={`toggle-${key}`}
                        checked={!disabled}
                        onCheckedChange={() => toggleType(key)}
                        disabled={prefsMutation.isPending || !(prefs?.inAppEnabled ?? true)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
