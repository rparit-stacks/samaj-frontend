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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Pencil,
  Trash2,
  User,
  Download,
} from "lucide-react";
import { adminDocumentsApi, type DocumentDto } from "@/lib/api";
import { toast } from "sonner";
import { UserQuickProfileDialog } from "@/components/admin/UserQuickProfileDialog";

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(n: number | null | undefined) {
  if (n == null || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

type ApprovedFilter = "all" | "pending" | "approved";

export default function AdminDocuments() {
  const queryClient = useQueryClient();
  const [rejectDoc, setRejectDoc] = useState<DocumentDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [approvedFilter, setApprovedFilter] = useState<ApprovedFilter>("pending");

  const [detailDoc, setDetailDoc] = useState<DocumentDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentDto | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editVisibility, setEditVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [editApproved, setEditApproved] = useState(false);
  const [editRejection, setEditRejection] = useState("");

  const approvedParam =
    approvedFilter === "all" ? undefined : approvedFilter === "approved";

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ["admin", "documents", "pending"],
    queryFn: adminDocumentsApi.listPending,
  });

  const { data: library = [], isLoading: loadingLibrary } = useQuery({
    queryKey: ["admin", "documents", "all", { q, category, approvedFilter }],
    queryFn: () =>
      adminDocumentsApi.list({
        q: q.trim() || undefined,
        category: category.trim() || undefined,
        approved: approvedParam,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminDocumentsApi.setApproval(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "documents"] });
      toast.success("Document approved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminDocumentsApi.setApproval(id, false, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "documents"] });
      setRejectDoc(null);
      setRejectReason("");
      toast.success("Document rejected");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (p: { id: string; body: Parameters<typeof adminDocumentsApi.update>[1] }) =>
      adminDocumentsApi.update(p.id, p.body),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "documents"] });
      setEditOpen(false);
      setDetailDoc(doc);
      toast.success("Document updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDocumentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "documents"] });
      setDeleteTarget(null);
      setDetailOpen(false);
      setDetailDoc(null);
      toast.success("Document deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleReject = () => {
    if (!rejectDoc) return;
    rejectMutation.mutate({ id: rejectDoc.id, reason: rejectReason.trim() || "Not approved." });
  };

  const openEdit = (doc: DocumentDto) => {
    setDetailDoc(doc);
    setEditTitle(doc.title);
    setEditDescription(doc.description ?? "");
    setEditCategory(doc.category);
    setEditVisibility(doc.visibility);
    setEditApproved(doc.approved);
    setEditRejection(doc.rejectionReason ?? "");
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!detailDoc) return;
    updateMutation.mutate({
      id: detailDoc.id,
      body: {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        category: editCategory.trim(),
        visibility: editVisibility,
        approved: editApproved,
        rejectionReason: editApproved ? null : editRejection.trim() || null,
      },
    });
  };

  const openDetail = (doc: DocumentDto) => {
    setDetailDoc(doc);
    setDetailOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-slate-600">
            Approve uploads, search the full library, edit metadata, or remove files (admin only).
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-slate-100 border border-slate-200">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white">
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-white">
              All documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  Pending approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPending ? (
                  <div className="flex items-center gap-2 text-slate-500 py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </div>
                ) : pending.length === 0 ? (
                  <p className="text-slate-500 py-8">No pending documents.</p>
                ) : (
                  <div className="space-y-3">
                    {pending.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="font-medium text-slate-900 truncate text-left hover:underline"
                            onClick={() => openDetail(doc)}
                          >
                            {doc.title}
                          </button>
                          <p className="text-sm text-slate-500">
                            {doc.category} · {formatDate(doc.createdAt)} · {doc.fileName}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-slate-300"
                            onClick={() => openDetail(doc)}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => approveMutation.mutate(doc.id)}
                            disabled={approveMutation.isPending && approveMutation.variables === doc.id}
                          >
                            {approveMutation.isPending && approveMutation.variables === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectDoc(doc);
                              setRejectReason("");
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">Library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Search</Label>
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Title, description, file name…"
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Category</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. legal"
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Approval</Label>
                    <Select
                      value={approvedFilter}
                      onValueChange={(v) => setApprovedFilter(v as ApprovedFilter)}
                    >
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending only</SelectItem>
                        <SelectItem value="approved">Approved only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {loadingLibrary ? (
                  <p className="text-slate-500 text-sm py-6">Loading…</p>
                ) : library.length === 0 ? (
                  <p className="text-slate-500 text-sm py-6">No documents match your filters.</p>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
                          <th className="p-3 font-medium">Title</th>
                          <th className="p-3 font-medium hidden sm:table-cell">Category</th>
                          <th className="p-3 font-medium">Status</th>
                          <th className="p-3 font-medium hidden md:table-cell">Updated</th>
                          <th className="p-3 font-medium w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {library.map((doc) => (
                          <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                            <td className="p-3 text-slate-900">
                              <button
                                type="button"
                                className="font-medium text-left hover:underline line-clamp-2"
                                onClick={() => openDetail(doc)}
                              >
                                {doc.title}
                              </button>
                              <p className="text-xs text-slate-500 truncate max-w-[240px]">{doc.fileName}</p>
                            </td>
                            <td className="p-3 text-slate-600 hidden sm:table-cell">{doc.category}</td>
                            <td className="p-3">
                              {doc.approved ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </td>
                            <td className="p-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                              {formatDate(doc.createdAt)}
                            </td>
                            <td className="p-3">
                              <Button size="sm" variant="outline" className="border-slate-300" onClick={() => openDetail(doc)}>
                                Open
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!rejectDoc} onOpenChange={(open) => !open && setRejectDoc(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle>Reject document</DialogTitle>
          </DialogHeader>
          {rejectDoc && (
            <div className="space-y-4">
              <p className="text-slate-600 text-sm">{rejectDoc.title}</p>
              <div>
                <Label className="text-slate-700">Reason (shown to uploader)</Label>
                <Input
                  placeholder="e.g. Incorrect category / document not relevant"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejectDoc(null)} className="border-slate-300">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
                  {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(o) => {
          setDetailOpen(o);
          if (!o) setDetailDoc(null);
        }}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document</DialogTitle>
          </DialogHeader>
          {detailDoc && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-slate-300">
                  {detailDoc.category}
                </Badge>
                <Badge variant="outline" className="border-slate-300">
                  {detailDoc.visibility}
                </Badge>
                {detailDoc.approved ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{detailDoc.title}</h3>
                {detailDoc.description ? (
                  <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{detailDoc.description}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-500">File</span>
                  <p className="font-mono truncate">{detailDoc.fileName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Size / type</span>
                  <p>
                    {formatBytes(detailDoc.fileSize)} · {detailDoc.fileType ?? "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Downloads</span>
                  <p className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {detailDoc.downloadCount}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Uploaded</span>
                  <p>{formatDate(detailDoc.createdAt)}</p>
                </div>
              </div>
              {detailDoc.rejectionReason ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                  <span className="font-medium">Rejection reason: </span>
                  {detailDoc.rejectionReason}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="border-slate-300" asChild>
                  <a href={detailDoc.fileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open file
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-300"
                  onClick={() => setProfileUserId(detailDoc.createdBy)}
                >
                  <User className="h-4 w-4 mr-1" />
                  Uploader
                </Button>
                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => openEdit(detailDoc)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteTarget(detailDoc)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
          <DialogHeader>
            <DialogTitle>Edit document</DialogTitle>
          </DialogHeader>
          {detailDoc && (
            <div className="space-y-3">
              <div>
                <Label className="text-slate-700">Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700">Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-slate-900 min-h-[80px]"
                />
              </div>
              <div>
                <Label className="text-slate-700">Category</Label>
                <Input
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-slate-900"
                />
              </div>
              <div>
                <Label className="text-slate-700">Visibility</Label>
                <Select value={editVisibility} onValueChange={(v) => setEditVisibility(v as "PUBLIC" | "PRIVATE")}>
                  <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                    <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Approved</p>
                  <p className="text-xs text-slate-500">Public listings require approval</p>
                </div>
                <Switch checked={editApproved} onCheckedChange={setEditApproved} />
              </div>
              {!editApproved ? (
                <div>
                  <Label className="text-slate-700">Rejection reason</Label>
                  <Input
                    value={editRejection}
                    onChange={(e) => setEditRejection(e.target.value)}
                    className="mt-1 bg-white border-slate-300 text-slate-900"
                    placeholder="Optional note for the uploader"
                  />
                </div>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="border-slate-300" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-slate-900 text-white hover:bg-slate-800"
                  onClick={saveEdit}
                  disabled={updateMutation.isPending || !editTitle.trim() || !editCategory.trim()}
                >
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UserQuickProfileDialog
        open={!!profileUserId}
        onOpenChange={(o) => !o && setProfileUserId(null)}
        userId={profileUserId}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              This removes the record and unlinks the file from the library. This cannot be undone.
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
