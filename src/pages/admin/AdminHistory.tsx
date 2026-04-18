import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, Plus, Pencil, Trash2, Loader2, RefreshCw } from "lucide-react";
import { adminHistoryApi, type HistoryDto } from "@/lib/api";
import { toast } from "sonner";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";

const TYPE_OPTIONS = [
  "FOUNDING",
  "MILESTONE",
  "ELECTION",
  "EVENT",
  "AWARD",
  "RENOVATION",
  "CULTURAL",
  "SOCIAL",
  "OTHER",
];

const ALL_TYPES = "__all__";

function formatLocalDate(d: string | null | undefined) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function emptyForm() {
  return {
    title: "",
    type: "MILESTONE",
    date: "",
    time: "",
    location: "",
    description: "",
    imageUrl: "",
  };
}

export default function AdminHistory() {
  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [q, setQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HistoryDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryDto | null>(null);

  const [form, setForm] = useState(emptyForm());

  const listQuery = useQuery({
    queryKey: ["admin", "history", page, typeFilter, q, fromDate, toDate],
    queryFn: () =>
      adminHistoryApi.list({
        page,
        size: 20,
        type: typeFilter === ALL_TYPES ? undefined : typeFilter,
        q: q.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminHistoryApi.create({
        title: form.title.trim(),
        type: form.type,
        date: form.date,
        time: form.time.trim() || null,
        location: form.location.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
      }),
    onSuccess: () => {
      toast.success("History entry created");
      qc.invalidateQueries({ queryKey: ["admin", "history"] });
      setCreateOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editTarget) return Promise.resolve(null as unknown as HistoryDto);
      return adminHistoryApi.update(editTarget.id, {
        title: form.title.trim(),
        type: form.type,
        date: form.date,
        time: form.time.trim() || null,
        location: form.location.trim(),
        description: form.description.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("History entry updated");
      qc.invalidateQueries({ queryKey: ["admin", "history"] });
      setEditTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminHistoryApi.delete(id),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "history"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => {
    setForm(emptyForm());
    setCreateOpen(true);
  };

  const openEdit = (h: HistoryDto) => {
    setForm({
      title: h.title,
      type: h.type,
      date: h.date,
      time: h.time ?? "",
      location: h.location,
      description: h.description ?? "",
      imageUrl: h.imageUrl ?? "",
    });
    setEditTarget(h);
  };

  const isFormValid = form.title.trim() && form.type && form.date && form.location.trim();

  const items = listQuery.data?.content ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <History className="h-6 w-6 text-slate-600" />
              Samaj History
            </h1>
            <p className="text-slate-600 mt-1 text-sm">
              Chronological log of milestones, events, and founding moments.
            </p>
          </div>
          <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 text-xs">Search</Label>
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(0); }}
                  placeholder="Title, location…"
                  className="bg-white border-slate-300 text-slate-900 h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 text-xs">Type</Label>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TYPES}>All types</SelectItem>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 text-xs">From date</Label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                  className="bg-white border-slate-300 text-slate-900 h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-700 text-xs">To date</Label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                  className="bg-white border-slate-300 text-slate-900 h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-slate-900 text-base">
              Entries
              {listQuery.data && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({listQuery.data.totalElements} total)
                </span>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" className="border-slate-300 h-8" onClick={() => listQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <p className="text-slate-500 text-sm py-8 text-center">No history entries found.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
                      <th className="p-3 font-medium">Title</th>
                      <th className="p-3 font-medium hidden sm:table-cell">Type</th>
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium hidden md:table-cell">Location</th>
                      <th className="p-3 font-medium w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((h) => (
                      <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80">
                        <td className="p-3 text-slate-900">
                          <p className="font-medium line-clamp-1">{h.title}</p>
                          {h.description && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{h.description}</p>
                          )}
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-medium">
                            {h.type}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {formatLocalDate(h.date)}
                          {h.time && <span className="text-slate-400 ml-1">· {h.time}</span>}
                        </td>
                        <td className="p-3 text-slate-600 hidden md:table-cell max-w-[160px] truncate">
                          {h.location}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-300 h-7 w-7 p-0"
                              onClick={() => openEdit(h)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                              onClick={() => setDeleteTarget(h)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
                <span>Page {(listQuery.data?.number ?? 0) + 1} / {totalPages}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-300"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-300"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setForm(emptyForm()); }}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add History Entry</DialogTitle>
          </DialogHeader>
          <HistoryForm form={form} setForm={setForm} />
          <DialogFooter className="mt-2">
            <Button variant="outline" className="border-slate-300" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !isFormValid}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit History Entry</DialogTitle>
          </DialogHeader>
          <HistoryForm form={form} setForm={setForm} />
          <DialogFooter className="mt-2">
            <Button variant="outline" className="border-slate-300" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-slate-900 text-white hover:bg-slate-800"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !isFormValid}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              "{deleteTarget?.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

type FormState = ReturnType<typeof emptyForm>;

function HistoryForm({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-3 py-1">
      <div>
        <Label className="text-slate-700">Title *</Label>
        <Input
          value={form.title}
          onChange={set("title")}
          placeholder="e.g. Samaj Founded"
          className="mt-1 bg-white border-slate-300 text-slate-900"
          maxLength={500}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label className="text-slate-700">Type * (preset or custom, max 64)</Label>
          <Input
            list="admin-history-type-suggestions"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({ ...f, type: e.target.value.slice(0, 64) }))
            }
            placeholder="e.g. MILESTONE"
            className="mt-1 bg-white border-slate-300 text-slate-900"
            maxLength={64}
          />
          <datalist id="admin-history-type-suggestions">
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div>
          <Label className="text-slate-700">Date *</Label>
          <Input
            type="date"
            value={form.date}
            onChange={set("date")}
            className="mt-1 bg-white border-slate-300 text-slate-900"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-slate-700">Time</Label>
          <Input
            value={form.time}
            onChange={set("time")}
            placeholder="e.g. 10:00 AM"
            className="mt-1 bg-white border-slate-300 text-slate-900"
            maxLength={32}
          />
        </div>
        <div>
          <Label className="text-slate-700">Location *</Label>
          <Input
            value={form.location}
            onChange={set("location")}
            placeholder="City / venue"
            className="mt-1 bg-white border-slate-300 text-slate-900"
            maxLength={500}
          />
        </div>
      </div>
      <div>
        <Label className="text-slate-700">Description</Label>
        <Textarea
          value={form.description}
          onChange={set("description")}
          placeholder="Brief summary of the event or milestone…"
          className="mt-1 bg-white border-slate-300 text-slate-900 min-h-[80px]"
        />
      </div>
      <ImageUrlWithUpload
        id="history-image-url"
        label="Image"
        optional
        value={form.imageUrl}
        onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
        folder="history"
        auth="admin"
        helperText="Optional photo for this history entry."
        inputClassName="mt-1 bg-white border-slate-300 text-slate-900"
      />
    </div>
  );
}
