import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Users, Heart, MessageSquare, Shield, TrendingUp, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminMatrimonyApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#06b6d4", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminMatrimonyAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin", "matrimony", "analytics"],
    queryFn: () => adminMatrimonyApi.getAnalytics(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="mx-auto max-w-7xl space-y-6 pb-10">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const data = analytics || {
    totalProfiles: 0,
    activeProfiles: 0,
    draftProfiles: 0,
    pausedProfiles: 0,
    verifiedProfiles: 0,
    verificationRate: 0,
    hiddenProfiles: 0,
    totalInterests: 0,
    totalConversations: 0,
    blockCount: 0,
  };

  const statusData = [
    { name: "Active", value: data.activeProfiles, color: "#10b981" },
    { name: "Draft", value: data.draftProfiles, color: "#f59e0b" },
    { name: "Paused", value: data.pausedProfiles, color: "#ef4444" },
  ];

  const verificationData = [
    { name: "Verified", value: data.verifiedProfiles, color: "#3b82f6" },
    { name: "Unverified", value: data.totalProfiles - data.verifiedProfiles, color: "#cbd5e1" },
  ];

  const engagementData = [
    { name: "Interests", value: data.totalInterests },
    { name: "Conversations", value: data.totalConversations },
  ];

  const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
    <Card className="border-slate-200">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-600 uppercase">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
            {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color.replace("text", "bg").replace("-900", "-100")}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
          <p className="text-slate-600 mt-1">
            Comprehensive metrics and insights into matrimony platform health and user engagement.
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="Total Profiles"
            value={data.totalProfiles}
            subtext={`${data.hiddenProfiles} hidden`}
            color="text-blue-600"
          />
          <StatCard
            icon={CheckCircle}
            label="Active Profiles"
            value={data.activeProfiles}
            subtext={`${((data.activeProfiles / data.totalProfiles) * 100).toFixed(1)}% of total`}
            color="text-green-600"
          />
          <StatCard
            icon={Shield}
            label="Verified Profiles"
            value={data.verifiedProfiles}
            subtext={`${data.verificationRate.toFixed(1)}% verification rate`}
            color="text-purple-600"
          />
          <StatCard
            icon={Heart}
            label="Total Interests"
            value={data.totalInterests}
            subtext={`${(data.totalInterests / Math.max(1, data.totalProfiles)).toFixed(1)} per profile avg`}
            color="text-red-600"
          />
          <StatCard
            icon={MessageSquare}
            label="Conversations"
            value={data.totalConversations}
            subtext={`From ${data.totalInterests} interests`}
            color="text-cyan-600"
          />
          <StatCard
            icon={TrendingUp}
            label="Active Blocks"
            value={data.blockCount}
            subtext={`${(data.blockCount / Math.max(1, data.totalProfiles) * 100).toFixed(2)}% block rate`}
            color="text-orange-600"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Status Distribution */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Profile Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base">Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={verificationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {verificationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Engagement Metrics */}
          <Card className="border-slate-200 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Platform Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-600 font-medium">Completion Rate</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {data.totalProfiles > 0
                    ? ((data.activeProfiles / data.totalProfiles) * 100).toFixed(1)
                    : "0"}
                  %
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-slate-600 font-medium">Avg Interests/Profile</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {data.totalProfiles > 0
                    ? (data.totalInterests / data.totalProfiles).toFixed(1)
                    : "0"}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-slate-600 font-medium">Match Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {data.totalInterests > 0
                    ? ((data.totalConversations / data.totalInterests) * 100).toFixed(1)
                    : "0"}
                  %
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-slate-600 font-medium">Safety Score</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {data.totalProfiles > 0
                    ? (100 -
                      ((data.blockCount + data.hiddenProfiles) / data.totalProfiles) * 100).toFixed(
                        1
                      )
                    : "100"}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
