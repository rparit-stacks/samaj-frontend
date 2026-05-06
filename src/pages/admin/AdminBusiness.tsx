import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Search, CheckCircle2, XCircle, Clock, Ban, Star, StarOff,
  Trash2, ChevronLeft, ChevronRight, MapPin, Filter,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { adminBusinessApi, type BusinessAdminSummaryDto } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Status = BusinessAdminSummaryDto["status"];

function statusConfig(status: Status) {
  switch (status) {
    case "APPROVED": return { label: "Approved", icon: CheckCircle2, className: "bg-green-100 text-green-800", dot: "bg-green-500" };
    case "REJECTED": return { label: "Rejected", icon: XCircle, className: "bg-red-100 text-red-800", dot: "bg-red-500" };
    case "BANNED":   return { label: "Banned",   icon: Ban,        className: "bg-slate-100 text-slate-700", dot: "bg-slate-400" };
    default:         return { label: "Pending",  icon: Clock,      className: "bg-amber-100 text-amber-800", dot: "bg-amber-400" };
  }
}

function ListingCard({
  b,
  onApprove,
  onRejectClick,
  onBan,
  onToggleFeatured,
  onDelete,
  loading,
}: {
  b: BusinessAdminSummaryDto;
  onApprove: () => void;
  onRejectClick: () => void;
  onBan: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
  loading: boolean;
}) {
  const cfg = statusConfig(b.status);
  const Icon = cfg.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Card body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-slate-900 truncate">{b.name}</p>
              {b.featured && (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                  <Star className="h-2.5 w-2.5" fill="currentColor" /> Featured
                </span>
              )}
            </div>
            {b.category && <p className="text-xs text-slate-500 mt-0.5">{b.category}</p>}
            {b.city && (
              <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <MapPin className="h-3 w-3" /> {b.city}
              </p>
            )}
          </div>
          {/* Status */}
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full flex-shrink-0 ${cfg.className}`}>
            <Icon className="h-3 w-3" /> {cfg.label}
          </span>
        </div>

        {/* Owner */}
        <div className="flex items-center gap-2 pt-0.5">
          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-slate-600">
              {(b.ownerName || b.ownerEmail || "?").slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{b.ownerName || "—"}</p>
            <p className="text-[11px] text-slate-400 truncate">{b.ownerEmail || "—"}</p>
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className="border-t border-slate-100 flex flex-wrap gap-1.5 p-2.5">
        {b.status === "PENDING" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50 gap-1"
              onClick={onApprove}
              disabled={loading}
            >
              <CheckCircle2 className="h-3 w-3" /> Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1"
              onClick={onRejectClick}
            >
              <XCircle className="h-3 w-3" /> Reject
            </Button>
          </>
        )}

        {b.status === "REJECTED" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50 gap-1"
            onClick={onApprove}
            disabled={loading}
          >
            <CheckCircle2 className="h-3 w-3" /> Approve
          </Button>
        )}

        {b.status === "APPROVED" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={onToggleFeatured}
              title={b.featured ? "Remove featured" : "Mark as featured"}
            >
              {b.featured ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
              {b.featured ? "Unfeature" : "Feature"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs text-slate-600 gap-1">
                  <Ban className="h-3 w-3" /> Ban
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ban "{b.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This suspends the listing and notifies the owner of a policy violation.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onBan}>Ban</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:bg-red-50 gap-1 ml-auto">
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{b.name}"?</AlertDialogTitle>
              <AlertDialogDescription>Permanently deletes this listing. Cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function AdminBusiness() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "business", page, statusFilter],
    queryFn: () => adminBusinessApi.list({ status: statusFilter, page, size: 20 }),
  });

  const filtered = (data?.content ?? []).filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.ownerName?.toLowerCase().includes(q) ||
      b.ownerEmail?.toLowerCase().includes(q) ||
      b.city?.toLowerCase().includes(q)
    );
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "business"] });
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminBusinessApi.approve(id),
    onSuccess: () => { toast({ title: "Listing approved" }); invalidate(); },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminBusinessApi.reject(id, reason),
    onSuccess: () => { toast({ title: "Listing rejected" }); setRejectTarget(null); setRejectReason(""); invalidate(); },
  });
  const banMutation = useMutation({
    mutationFn: (id: string) => adminBusinessApi.ban(id),
    onSuccess: () => { toast({ title: "Listing banned" }); invalidate(); },
  });
  const featuredMutation = useMutation({
    mutationFn: (id: string) => adminBusinessApi.toggleFeatured(id),
    onSuccess: () => { toast({ title: "Featured status updated" }); invalidate(); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminBusinessApi.delete(id),
    onSuccess: () => { toast({ title: "Listing deleted" }); invalidate(); },
  });

  const totalPages = data?.totalPages ?? 1;

  // Stat counts from current dataset
  const allListings = data?.content ?? [];
  const pendingCount = allListings.filter((b) => b.status === "PENDING").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Business Directory</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Review and manage community business listings
              {pendingCount > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              All Listings
              <span className="text-sm font-normal text-slate-500">{data?.totalElements ?? 0} total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, owner, city…"
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-36 flex-shrink-0">
                  <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="BANNED">Banned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Listing cards */}
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 text-slate-500">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No listings found</p>
                {(search || statusFilter !== "ALL") && (
                  <p className="text-sm mt-1">Try adjusting your search or filter</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((b) => (
                  <ListingCard
                    key={b.id}
                    b={b}
                    loading={approveMutation.isPending}
                    onApprove={() => approveMutation.mutate(b.id)}
                    onRejectClick={() => { setRejectTarget(b.id); setRejectReason(""); }}
                    onBan={() => banMutation.mutate(b.id)}
                    onToggleFeatured={() => featuredMutation.mutate(b.id)}
                    onDelete={() => deleteMutation.mutate(b.id)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !isLoading && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-sm text-slate-500">
                  Page {page + 1} / {totalPages} · {data?.totalElements ?? 0} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
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

        {/* Reject dialog */}
        <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject listing</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Provide a reason — this will be shown to the business owner.</p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Missing contact information, inappropriate content…"
                rows={3}
                maxLength={500}
                autoFocus
              />
              <p className="text-xs text-slate-400 text-right">{rejectReason.length}/500</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget, reason: rejectReason })}
              >
                Reject listing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
