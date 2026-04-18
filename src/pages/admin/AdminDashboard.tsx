import {
  AlertTriangle,
  Calendar,
  FileText,
  Loader2,
  MessageSquare,
  Newspaper,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { adminCommunityApi, adminDocumentsApi, adminEmergencyApi, adminEventsApi, adminNewsApi, adminSystemApi } from "@/lib/api";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { data: adminMe } = useQuery({
    queryKey: ["admin", "system", "me"],
    queryFn: adminSystemApi.me,
  });

  const { data: newsStats, isLoading: newsStatsLoading } = useQuery({
    queryKey: ["admin", "news", "stats"],
    queryFn: adminNewsApi.getStats,
  });

  const { data: pendingDocs, isLoading: pendingDocsLoading } = useQuery({
    queryKey: ["admin", "documents", "pending"],
    queryFn: adminDocumentsApi.listPending,
  });

  const { data: emergencies, isLoading: emergenciesLoading } = useQuery({
    queryKey: ["admin", "emergencies", "all"],
    queryFn: adminEmergencyApi.listAll,
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["admin", "events", "list"],
    queryFn: () => adminEventsApi.list({ sort: "list" }),
  });

  const { data: communityAnalytics, isLoading: communityLoading } = useQuery({
    queryKey: ["admin", "community", "analytics"],
    queryFn: adminCommunityApi.myAnalytics,
  });

  const isLoading =
    newsStatsLoading || pendingDocsLoading || emergenciesLoading || eventsLoading || communityLoading;

  const activeEmergencies = (emergencies ?? []).filter(
    (e) =>
      e.status === "OPEN" || e.status === "IN_PROGRESS" || e.status === "HELP_RECEIVED"
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Live overview from services (no mock data)</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="News"
            icon={Newspaper}
            value={newsStats?.total ?? 0}
            subtitle="Total articles"
            loading={newsStatsLoading}
          />
          <StatCard
            title="Pinned news"
            icon={Newspaper}
            value={newsStats?.pinned ?? 0}
            subtitle="Highlighted"
            loading={newsStatsLoading}
          />
          <StatCard
            title="Documents pending"
            icon={FileText}
            value={pendingDocs?.length ?? 0}
            subtitle="Need approval"
            loading={pendingDocsLoading}
          />
          <StatCard
            title="Active SOS"
            icon={AlertTriangle}
            value={activeEmergencies.length}
            subtitle="OPEN / IN_PROGRESS"
            loading={emergenciesLoading}
          />
          <StatCard
            title="Events"
            icon={Calendar}
            value={events?.length ?? 0}
            subtitle="Total listed"
            loading={eventsLoading}
          />
          <StatCard
            title="Community posts"
            icon={MessageSquare}
            value={communityAnalytics?.totalPosts ?? 0}
            subtitle="(your analytics)"
            loading={communityLoading}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center justify-between">
                <span>Quick actions</span>
                {isLoading ? (
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                to="/admin/documents"
                className="block rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Review pending documents
                  </span>
                  <span className="text-xs text-slate-600">{pendingDocs?.length ?? 0}</span>
                </div>
              </Link>
              <Link
                to="/admin/content"
                className="block rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4" /> Manage news
                </span>
              </Link>
              <Link
                to="/admin/emergency"
                className="block rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> View emergencies
                  </span>
                  <span className="text-xs text-slate-600">{activeEmergencies.length} active</span>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Admin access</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-600 text-sm space-y-3">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <p className="text-slate-800">
                  <span className="text-slate-500">Role:</span>{" "}
                  <span className="font-medium text-slate-900">{adminMe?.role ?? "—"}</span>
                </p>
                <p className="mt-1 text-slate-800">
                  <span className="text-slate-500">Full access:</span>{" "}
                  <span className="font-medium text-slate-900">
                    {adminMe ? (adminMe.fullAccess ? "Yes" : "No") : "—"}
                  </span>
                </p>
                <p className="mt-1 text-slate-800">
                  <span className="text-slate-500">Assigned services:</span>{" "}
                  <span className="font-medium text-slate-900">
                    {adminMe ? adminMe.assignedServiceKeys.length : "—"}
                  </span>
                </p>
              </div>
              <p>
                Settings page pulls the same data via <code>/admin/system/me</code> and{" "}
                <code>/admin/system/catalog</code> (no mock data).
              </p>
              <p>
                If you’re a child admin (MODERATOR), you will only be able to open admin pages for your assigned services.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Users;
  loading?: boolean;
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {loading ? <span className="text-slate-400">—</span> : value}
        </p>
        <p className="text-sm text-slate-700">{title}</p>
        <p className="text-xs mt-1 text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
