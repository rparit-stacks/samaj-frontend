import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IndianRupee,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminDonationApi, type DonationItemDto } from "@/lib/api";

function formatRupees(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: DonationItemDto["status"] }) {
  if (status === "SUCCESS")
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Success
      </Badge>
    );
  if (status === "FAILED")
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  return (
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

export default function AdminDonations() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin", "donations", "stats"],
    queryFn: adminDonationApi.stats,
  });

  const { data: donations, isLoading: listLoading } = useQuery({
    queryKey: ["admin", "donations", "list", page, statusFilter],
    queryFn: () =>
      adminDonationApi.list({
        page,
        size: 20,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
  });

  const filteredContent = (donations?.content ?? []).filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.userName?.toLowerCase().includes(q) ||
      d.razorpayOrderId?.toLowerCase().includes(q) ||
      d.razorpayPaymentId?.toLowerCase().includes(q) ||
      d.notes?.toLowerCase().includes(q)
    );
  });

  const totalPages = donations?.totalPages ?? 1;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <HeartHandshake className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Donations</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track all community donations</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statsLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <IndianRupee className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Raised</p>
                      <p className="text-lg font-bold text-slate-900">
                        {stats ? formatRupees(stats.totalSuccessAmountPaise) : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Last 30 Days</p>
                      <p className="text-lg font-bold text-slate-900">
                        {stats ? formatRupees(stats.thisMonthSuccessAmountPaise) : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-700" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total Donors</p>
                      <p className="text-lg font-bold text-slate-900">{stats?.totalDonors ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Successful</p>
                      <p className="text-lg font-bold text-slate-900">{stats?.successCount ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Failed</p>
                      <p className="text-lg font-bold text-slate-900">{stats?.failedCount ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Pending</p>
                      <p className="text-lg font-bold text-slate-900">{stats?.pendingCount ?? "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Donations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, order ID, payment ID..."
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {listLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <HeartHandshake className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No donations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Donor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Order ID</TableHead>
                      <TableHead className="hidden lg:table-cell">Message</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContent.map((d) => (
                      <TableRow key={d.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{d.userName || "—"}</TableCell>
                        <TableCell className="font-semibold text-green-700">
                          {formatRupees(d.amountPaise)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={d.status} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs font-mono text-slate-500">
                          {d.razorpayOrderId ? d.razorpayOrderId.substring(0, 20) + "…" : "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-slate-600 max-w-[200px] truncate">
                          {d.notes || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(d.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-slate-500">
                  Page {page + 1} of {totalPages} · {donations?.totalElements ?? 0} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
