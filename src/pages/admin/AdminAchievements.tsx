import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  adminAchieversApi,
  type AchievementAdminSummaryDto,
  type AchievementDetailDto,
  type AchievementFieldItem,
  type AchievementFieldTemplateDto,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, RefreshCw, Check, X, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FILTER_ALL = "__all__";

function statusBadge(s: string) {
  if (s === "APPROVED") return "bg-emerald-100 text-emerald-800";
  if (s === "PENDING") return "bg-amber-100 text-amber-800";
  if (s === "REJECTED") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

export default function AdminAchievements() {
  const qc = useQueryClient();
  const [status, setStatus] = useState(FILTER_ALL);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AchievementDetailDto | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [marqueeDays, setMarqueeDays] = useState(3);
  const [rejectReason, setRejectReason] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editStatus, setEditStatus] = useState("PENDING");
  const [editFieldsJson, setEditFieldsJson] = useState("[]");
  const [editMarqueeEnabled, setEditMarqueeEnabled] = useState(true);
  const [editMarqueeStart, setEditMarqueeStart] = useState("");
  const [editMarqueeEnd, setEditMarqueeEnd] = useState("");
  const [editRejection, setEditRejection] = useState("");

  const listQuery = useQuery({
    queryKey: ["admin", "achievements", status, page],
    queryFn: () =>
      adminAchieversApi.list({
        status: status === FILTER_ALL ? undefined : status,
        page,
        size: 20,
      }),
  });

  const templatesQuery = useQuery({
    queryKey: ["admin", "achievement-templates"],
    queryFn: () => adminAchieversApi.listTemplates(false),
  });

  const applyDetailToForm = (d: AchievementDetailDto) => {
    setDetail(d);
    setEditHeadline(d.headline);
    setEditStatus(d.status);
    setEditFieldsJson(JSON.stringify(d.fields, null, 2));
    setEditMarqueeEnabled(d.marqueeEnabled);
    setEditMarqueeStart(d.marqueeStart ? d.marqueeStart.slice(0, 16) : "");
    setEditMarqueeEnd(d.marqueeEnd ? d.marqueeEnd.slice(0, 16) : "");
    setEditRejection(d.rejectionReason ?? "");
  };

  const openEdit = async (row: AchievementAdminSummaryDto) => {
    const d = await adminAchieversApi.get(row.id);
    applyDetailToForm(d);
    setEditOpen(true);
  };

  const openApprove = async (row: AchievementAdminSummaryDto) => {
    const d = await adminAchieversApi.get(row.id);
    applyDetailToForm(d);
    setMarqueeDays(3);
    setApproveOpen(true);
  };

  const openReject = async (row: AchievementAdminSummaryDto) => {
    const d = await adminAchieversApi.get(row.id);
    applyDetailToForm(d);
    setRejectReason("");
    setRejectOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!detail) return;
      let fields: AchievementFieldItem[];
      try {
        fields = JSON.parse(editFieldsJson) as AchievementFieldItem[];
      } catch {
        throw new Error("Invalid JSON for fields");
      }
      return adminAchieversApi.fullUpdate(detail.id, {
        headline: editHeadline.trim(),
        fields,
        status: editStatus,
        marqueeEnabled: editMarqueeEnabled,
        marqueeStart: editMarqueeStart ? new Date(editMarqueeStart).toISOString() : null,
        marqueeEnd: editMarqueeEnd ? new Date(editMarqueeEnd).toISOString() : null,
        rejectionReason: editRejection.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "achievements"] });
      qc.invalidateQueries({ queryKey: ["achievers"] });
      setEditOpen(false);
      setDetail(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!detail) return Promise.resolve(null);
      return adminAchieversApi.approve(detail.id, { marqueeDays, marqueeEnabled: true });
    },
    onSuccess: () => {
      toast.success("Approved");
      qc.invalidateQueries({ queryKey: ["admin", "achievements"] });
      qc.invalidateQueries({ queryKey: ["achievers"] });
      setApproveOpen(false);
      setEditOpen(false);
      setDetail(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!detail) return Promise.resolve(null);
      return adminAchieversApi.reject(detail.id, rejectReason.trim());
    },
    onSuccess: () => {
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["admin", "achievements"] });
      qc.invalidateQueries({ queryKey: ["achievers"] });
      setRejectOpen(false);
      setRejectReason("");
      setEditOpen(false);
      setDetail(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Reject failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAchieversApi.delete(id),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "achievements"] });
      qc.invalidateQueries({ queryKey: ["achievers"] });
      setEditOpen(false);
      setDetail(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-600" />
            Achievers
          </h1>
          <p className="text-slate-600 mt-1">Moderate submissions, marquee window, and reusable field templates.</p>
        </div>

        <Tabs defaultValue="achievements">
          <TabsList>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="templates">Field templates</TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3 flex flex-row flex-wrap items-end gap-3 justify-between">
                <CardTitle className="text-base">Queue</CardTitle>
                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FILTER_ALL}>All statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-9" onClick={() => listQuery.refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {listQuery.isLoading ? (
                  <div className="flex justify-center py-12 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(listQuery.data?.content ?? []).map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-medium text-slate-900 line-clamp-1">{row.headline}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {row.userName || "—"} · {row.userEmail}
                          </p>
                        </div>
                        <Badge className={statusBadge(row.status)}>{row.status}</Badge>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => void openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-700"
                            onClick={() => void openApprove(row)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => void openReject(row)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {listQuery.data?.content.length === 0 && (
                      <p className="text-center text-slate-500 py-8 text-sm">No achievements.</p>
                    )}
                  </div>
                )}
                {listQuery.data && listQuery.data.totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4 text-sm text-slate-600">
                    <span>
                      Page {listQuery.data.number + 1} / {listQuery.data.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
                        Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page + 1 >= listQuery.data.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <AdminTemplatesPanel />
          </TabsContent>
        </Tabs>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit achievement</DialogTitle>
            </DialogHeader>
            {detail && (
              <div className="space-y-3 py-2">
                <div>
                  <Label>Headline</Label>
                  <Input value={editHeadline} onChange={(e) => setEditHeadline(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">PENDING</SelectItem>
                      <SelectItem value="APPROVED">APPROVED</SelectItem>
                      <SelectItem value="REJECTED">REJECTED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mEn"
                    checked={editMarqueeEnabled}
                    onChange={(e) => setEditMarqueeEnabled(e.target.checked)}
                  />
                  <Label htmlFor="mEn">Marquee enabled</Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Marquee start (local)</Label>
                    <Input
                      type="datetime-local"
                      value={editMarqueeStart}
                      onChange={(e) => setEditMarqueeStart(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Marquee end (local)</Label>
                    <Input
                      type="datetime-local"
                      value={editMarqueeEnd}
                      onChange={(e) => setEditMarqueeEnd(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Rejection reason (if rejected)</Label>
                  <Textarea value={editRejection} onChange={(e) => setEditRejection(e.target.value)} className="mt-1" rows={2} />
                </div>
                <div>
                  <Label>Fields JSON</Label>
                  <Textarea value={editFieldsJson} onChange={(e) => setEditFieldsJson(e.target.value)} className="mt-1 font-mono text-xs" rows={10} />
                </div>
              </div>
            )}
            <DialogFooter className="flex-wrap gap-2">
              <Button
                variant="destructive"
                onClick={() => detail && window.confirm("Delete this achievement?") && deleteMutation.mutate(detail.id)}
                disabled={deleteMutation.isPending || !detail}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve &amp; schedule marquee</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label>Visible on homepage marquee for (days)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={marqueeDays}
                onChange={(e) => setMarqueeDays(Number(e.target.value) || 3)}
              />
              <p className="text-xs text-slate-500">Default 3 days from approval time.</p>
            </div>
            <DialogFooter>
              <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject achievement</DialogTitle>
            </DialogHeader>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason…" rows={3} />
            <DialogFooter>
              <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={!rejectReason.trim() || rejectMutation.isPending}>
                Reject
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function AdminTemplatesPanel() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "achievement-templates"],
    queryFn: () => adminAchieversApi.listTemplates(false),
  });
  const [name, setName] = useState("");
  const [schema, setSchema] = useState(
    '[\n  { "type": "TEXT", "label": "Award / title" },\n  { "type": "DATE", "label": "Date" },\n  { "type": "LONG_TEXT", "label": "Details" }\n]',
  );

  const createMut = useMutation({
    mutationFn: () => adminAchieversApi.createTemplate({ name: name.trim(), schemaJson: schema }),
    onSuccess: () => {
      toast.success("Template created");
      setName("");
      qc.invalidateQueries({ queryKey: ["admin", "achievement-templates"] });
      qc.invalidateQueries({ queryKey: ["achievers", "field-templates"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => adminAchieversApi.deleteTemplate(id),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin", "achievement-templates"] });
      qc.invalidateQueries({ queryKey: ["achievers", "field-templates"] });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reusable layouts</CardTitle>
        <p className="text-sm text-slate-600">
          JSON array of <code className="text-xs bg-slate-100 px-1 rounded">type</code> +{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">label</code> only (no values). Types: TEXT, LONG_TEXT, DATE, LINK, IMAGE.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <Label>New template name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sports achievement" />
          <Label>Schema JSON</Label>
          <Textarea value={schema} onChange={(e) => setSchema(e.target.value)} rows={8} className="font-mono text-xs" />
          <Button onClick={() => name.trim() && createMut.mutate()} disabled={createMut.isPending || !name.trim()}>
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create template"}
          </Button>
        </div>

        {q.isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        ) : (
          <div className="space-y-2">
            {(q.data ?? []).map((t: AchievementFieldTemplateDto) => (
              <div key={t.id} className="flex items-start justify-between gap-2 p-3 border rounded-lg bg-white">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.active ? "Active" : "Inactive"}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => delMut.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
