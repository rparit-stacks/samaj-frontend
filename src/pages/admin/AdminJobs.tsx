import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Pencil,
  Plus,
  Search,
  Star,
  StarOff,
  Trash2,
  XCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { adminJobApi, type JobAdminSummaryDto } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  JobListingFormFields,
  emptyJobFormState,
  jobDetailToFormState,
  jobFormStateToPayload,
  type JobListingFormState,
} from "@/components/jobs/JobListingFormFields";

type Status = JobAdminSummaryDto["status"];

function statusStyle(status: Status) {
  switch (status) {
    case "APPROVED":
      return { label: "Approved", className: "bg-green-100 text-green-800" };
    case "REJECTED":
      return { label: "Rejected", className: "bg-red-100 text-red-800" };
    default:
      return { label: "Pending", className: "bg-amber-100 text-amber-800" };
  }
}

function JobAdminCard({
  j,
  onApproveClick,
  onRejectClick,
  onToggleFeatured,
  onDelete,
  onEditClick,
  busy,
}: {
  j: JobAdminSummaryDto;
  onApproveClick: () => void;
  onRejectClick: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
  onEditClick: () => void;
  busy: boolean;
}) {
  const st = statusStyle(j.status);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm text-slate-900 truncate">{j.title}</p>
              {j.featured && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5" fill="currentColor" /> Featured
                </span>
              )}
              {j.postedByAdmin && (
                <span className="text-[10px] text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full">Admin post</span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5 truncate">{j.company}</p>
            {j.location && (
              <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <MapPin className="h-3 w-3 flex-shrink-0" /> {j.location}
              </p>
            )}
          </div>
          <span className={`text-[11px] font-medium px-2 py-1 rounded-full flex-shrink-0 ${st.className}`}>{st.label}</span>
        </div>
        {!j.postedByAdmin && (j.submittedByName || j.submittedByEmail) && (
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-50">
            <span className="font-medium text-slate-600">Submitted by:</span>{" "}
            {[j.submittedByName, j.submittedByEmail].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 flex flex-wrap gap-1.5 p-2.5">
        {j.status === "PENDING" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50 gap-1"
              onClick={onApproveClick}
              disabled={busy}
            >
              <CheckCircle2 className="h-3 w-3" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1" onClick={onRejectClick}>
              <XCircle className="h-3 w-3" /> Reject
            </Button>
          </>
        )}
        {j.status === "REJECTED" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50 gap-1"
            onClick={onApproveClick}
            disabled={busy}
          >
            <CheckCircle2 className="h-3 w-3" /> Approve
          </Button>
        )}
        {j.status === "APPROVED" && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onToggleFeatured} disabled={busy}>
            {j.featured ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
            {j.featured ? "Unfeature" : "Feature"}
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onEditClick} disabled={busy}>
          <Pencil className="h-3 w-3" /> Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:bg-red-50 gap-1 ml-auto">
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this job?</AlertDialogTitle>
              <AlertDialogDescription>Permanently removes the listing.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={onDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function AdminJobs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [approveFeatured, setApproveFeatured] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<JobListingFormState>(emptyJobFormState);
  const [createErrors, setCreateErrors] = useState<Partial<Record<keyof JobListingFormState, string>>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<JobListingFormState | null>(null);
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof JobListingFormState, string>>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "jobs", page, statusFilter],
    queryFn: () => adminJobApi.list({ status: statusFilter, page, size: 20 }),
  });

  const { data: editDetail } = useQuery({
    queryKey: ["admin", "jobs", "detail", editId],
    queryFn: () => adminJobApi.get(editId!),
    enabled: !!editId,
  });

  useEffect(() => {
    if (!editId || !editDetail || editDetail.id !== editId) return;
    setEditForm(jobDetailToFormState(editDetail));
  }, [editDetail, editId]);

  const openEdit = (id: string) => {
    setEditId(id);
    setEditForm(null);
    setEditErrors({});
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "jobs"] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) => adminJobApi.approve(id, featured),
    onSuccess: () => {
      toast({ title: "Job approved" });
      setApproveTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminJobApi.reject(id, reason),
    onSuccess: () => {
      toast({ title: "Job rejected" });
      setRejectTarget(null);
      setRejectReason("");
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Reject failed", description: e.message, variant: "destructive" }),
  });

  const featuredMutation = useMutation({
    mutationFn: (id: string) => adminJobApi.toggleFeatured(id),
    onSuccess: () => {
      toast({ title: "Featured updated" });
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminJobApi.delete(id),
    onSuccess: () => {
      toast({ title: "Job deleted" });
      invalidate();
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: ReturnType<typeof jobFormStateToPayload>) => adminJobApi.create(body),
    onSuccess: () => {
      toast({ title: "Job published" });
      setCreateOpen(false);
      setCreateForm(emptyJobFormState);
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReturnType<typeof jobFormStateToPayload> }) => adminJobApi.update(id, body),
    onSuccess: () => {
      toast({ title: "Job updated" });
      setEditId(null);
      setEditForm(null);
      invalidate();
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const filtered = (data?.content ?? []).filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      j.title?.toLowerCase().includes(q) ||
      j.company?.toLowerCase().includes(q) ||
      j.submittedByName?.toLowerCase().includes(q) ||
      j.submittedByEmail?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q)
    );
  });

  const totalPages = data?.totalPages ?? 1;
  const busy = approveMutation.isPending || rejectMutation.isPending;

  function validateCreate(): boolean {
    const e: typeof createErrors = {};
    if (!createForm.title.trim()) e.title = "Required";
    if (!createForm.company.trim()) e.company = "Required";
    if (!createForm.description.trim()) e.description = "Required";
    if (createForm.applyUrl.trim() && !/^https?:\/\/.+/i.test(createForm.applyUrl.trim())) {
      e.applyUrl = "Must start with http:// or https://";
    }
    setCreateErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateEdit(): boolean {
    if (!editForm) return false;
    const e: typeof editErrors = {};
    if (!editForm.title.trim()) e.title = "Required";
    if (!editForm.company.trim()) e.company = "Required";
    if (!editForm.description.trim()) e.description = "Required";
    if (editForm.applyUrl.trim() && !/^https?:\/\/.+/i.test(editForm.applyUrl.trim())) {
      e.applyUrl = "Must start with http:// or https://";
    }
    setEditErrors(e);
    return Object.keys(e).length === 0;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Job listings</h1>
              <p className="text-slate-500 text-sm mt-0.5">Publish roles, review member submissions, and feature key openings</p>
            </div>
          </div>
          <Button className="gap-1.5 rounded-xl shrink-0" onClick={() => { setCreateForm(emptyJobFormState); setCreateErrors({}); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" /> Post job (admin)
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              All jobs
              <span className="text-sm font-normal text-slate-500">{data?.totalElements ?? 0} total</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, company, submitter…" className="pl-9" />
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
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-14 text-slate-500">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No jobs found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((j) => (
                  <JobAdminCard
                    key={j.id}
                    j={j}
                    busy={busy}
                    onApproveClick={() => { setApproveTarget(j.id); setApproveFeatured(false); }}
                    onRejectClick={() => { setRejectTarget(j.id); setRejectReason(""); }}
                    onToggleFeatured={() => featuredMutation.mutate(j.id)}
                    onDelete={() => deleteMutation.mutate(j.id)}
                    onEditClick={() => openEdit(j.id)}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && !isLoading && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-sm text-slate-500">
                  Page {page + 1} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
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

        <Dialog open={!!approveTarget} onOpenChange={(o) => { if (!o) setApproveTarget(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve job</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 py-2">
              <Checkbox id="feat" checked={approveFeatured} onCheckedChange={(c) => setApproveFeatured(c === true)} />
              <Label htmlFor="feat" className="text-sm font-normal cursor-pointer">
                Mark as featured on the job board
              </Label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={!approveTarget || approveMutation.isPending}
                onClick={() => approveTarget && approveMutation.mutate({ id: approveTarget, featured: approveFeatured })}
              >
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject job</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">Reason is shown to the submitter.</p>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} maxLength={500} placeholder="Reason…" />
            <p className="text-xs text-slate-400 text-right">{rejectReason.length}/500</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget, reason: rejectReason })}
              >
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post job (admin)</DialogTitle>
            </DialogHeader>
            <JobListingFormFields form={createForm} onChange={(p) => setCreateForm((f) => ({ ...f, ...p }))} errors={createErrors} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={createMutation.isPending}
                onClick={() => {
                  if (!validateCreate()) return;
                  createMutation.mutate(jobFormStateToPayload(createForm));
                }}
              >
                Publish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!editId}
          onOpenChange={(o) => {
            if (!o) {
              setEditId(null);
              setEditForm(null);
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit job</DialogTitle>
            </DialogHeader>
            {editId && !editForm && <Skeleton className="h-40 w-full" />}
            {editForm && (
              <>
                <JobListingFormFields form={editForm} onChange={(p) => setEditForm((f) => ({ ...f!, ...p }))} errors={editErrors} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setEditId(null); setEditForm(null); }}>
                    Cancel
                  </Button>
                  <Button
                    disabled={updateMutation.isPending}
                    onClick={() => {
                      if (!validateEdit() || !editId || !editForm) return;
                      updateMutation.mutate({ id: editId, body: jobFormStateToPayload(editForm) });
                    }}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
