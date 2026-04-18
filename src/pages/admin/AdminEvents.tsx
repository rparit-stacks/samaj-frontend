import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Calendar,
  MapPin,
  Users,
  Clock,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { adminEventsApi } from "@/lib/api";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEvents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [analyticsId, setAnalyticsId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["admin", "events", "list"],
    queryFn: () => adminEventsApi.list({ sort: "list" }),
  });

  const { data: analytics, isFetching: analyticsLoading } = useQuery({
    queryKey: ["admin", "events", "analytics", analyticsId],
    queryFn: () => adminEventsApi.getAnalytics(analyticsId!),
    enabled: analyticsId != null,
  });

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ["admin", "events", "detail", detailId],
    queryFn: () => adminEventsApi.getById(detailId!),
    enabled: detailId != null,
  });

  const filteredEvents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = events ?? [];
    if (!q) return list;
    return list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.location ?? "").toLowerCase().includes(q) ||
        (e.organizer?.displayName ?? "").toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Events management</h1>
            <p className="text-slate-600">
              All events from the Events service. Use your admin account to create and monitor community events.
            </p>
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white" asChild>
            <Link to="/events/create" className="inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Create event
            </Link>
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by title, location, organizer…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-slate-300 text-slate-900"
          />
        </div>

        {events && !isLoading ? (
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span>
              Total: <strong className="text-slate-900">{events.length}</strong>
            </span>
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))
          ) : isError ? (
            <Card className="bg-white border-slate-200 shadow-sm md:col-span-2">
              <CardContent className="p-6 text-slate-600">
                Failed to load events. Check gateway, Events service (8088), and that you are logged in as
                admin (token sent to API).
              </CardContent>
            </Card>
          ) : filteredEvents.length === 0 ? (
            <Card className="bg-white border-slate-200 shadow-sm md:col-span-2">
              <CardContent className="p-6 text-slate-600">No events found.</CardContent>
            </Card>
          ) : (
            filteredEvents.map((event) => (
              <Card key={event.id} className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4 gap-2">
                    <div className="min-w-0">
                      <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
                        {event.type}
                      </Badge>
                      <h3 className="text-slate-900 font-semibold text-lg mt-2 truncate">{event.title}</h3>
                      <p className="text-slate-600 text-sm mt-1 truncate">
                        Organizer: {event.organizer?.displayName || event.organizer?.userId || "—"}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="p-2 hover:bg-slate-100 rounded-lg shrink-0">
                          <MoreVertical className="h-4 w-4 text-slate-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border-slate-200">
                        <DropdownMenuItem
                          className="text-slate-800 focus:bg-slate-100"
                          onClick={() => setDetailId(event.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-slate-800 focus:bg-slate-100"
                          onClick={() => setAnalyticsId(event.id)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" /> RSVP analytics
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      Going {event.goingCount}
                    </Badge>
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      Interested {event.interestedCount}
                    </Badge>
                    <Badge variant="outline" className="border-slate-300 text-slate-700">
                      Not going {event.notGoingCount}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 shrink-0" />
                      {event.date}
                    </p>
                    {event.time ? (
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        {event.time}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {event.location}
                    </p>
                    <p className="flex items-center gap-2 text-slate-500">
                      <Users className="h-4 w-4 shrink-0" />
                      <span>
                        RSVPs: {event.goingCount + event.interestedCount + event.notGoingCount}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Dialog
          open={analyticsId != null}
          onOpenChange={(open) => {
            if (!open) setAnalyticsId(null);
          }}
        >
          <DialogContent className="bg-white border-slate-200 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>RSVP analytics</DialogTitle>
            </DialogHeader>
            {analyticsLoading ? (
              <p className="text-slate-600 py-4">Loading…</p>
            ) : analytics ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
                    <p className="text-2xl font-bold text-emerald-700">{analytics.goingCount}</p>
                    <p className="text-emerald-700 text-xs mt-1">Going</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
                    <p className="text-2xl font-bold text-amber-700">{analytics.interestedCount}</p>
                    <p className="text-amber-700 text-xs mt-1">Interested</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                    <p className="text-2xl font-bold text-slate-800">{analytics.notGoingCount}</p>
                    <p className="text-slate-600 text-xs mt-1">Not going</p>
                  </div>
                </div>
                {analytics.goingAttendees?.length ? (
                  <div>
                    <p className="text-slate-800 font-medium mb-2">
                      Going ({analytics.goingAttendees.length})
                    </p>
                    <ul className="max-h-40 overflow-y-auto space-y-1 text-slate-600">
                      {analytics.goingAttendees.map((a) => (
                        <li key={a.userId}>
                          {a.displayName || a.userId}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-slate-500">No going RSVPs yet.</p>
                )}
              </div>
            ) : (
              <p className="text-slate-600">Could not load analytics.</p>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={detailId != null}
          onOpenChange={(open) => {
            if (!open) setDetailId(null);
          }}
        >
          <DialogContent className="bg-white border-slate-200 sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Event details</DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <p className="text-slate-600 py-4">Loading…</p>
            ) : detail ? (
              <div className="space-y-4 text-sm text-slate-700">
                <div>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 mb-2">
                    {detail.type}
                  </Badge>
                  <h3 className="text-lg font-semibold text-slate-900">{detail.title}</h3>
                  <p className="text-slate-500 mt-1">
                    Organizer:{" "}
                    {detail.organizer?.displayName || detail.organizer?.userId || "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>{detail.date}</span>
                  </p>
                  {detail.time ? (
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                      <span>{detail.time}</span>
                    </p>
                  ) : null}
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                    <span>{detail.location}</span>
                  </p>
                </div>
                {detail.description ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                    <p className="whitespace-pre-wrap">{detail.description}</p>
                  </div>
                ) : null}
                {detail.schedule && detail.schedule.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Schedule</p>
                    <ul className="space-y-1 list-disc pl-5">
                      {detail.schedule.map((s, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{s.label}</span>
                          {s.time ? ` — ${s.time}` : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-slate-600">Could not load event details.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
