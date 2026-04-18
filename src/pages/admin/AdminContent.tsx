import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Pin,
  PinOff,
  FileText,
  Newspaper,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminNewsApi, adminDocumentsApi, type NewsCategory, type NewsItem } from "@/lib/api";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function AdminContent() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<NewsItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  const { data: newsPage, isLoading: newsLoading, isError: newsError } = useQuery({
    queryKey: ["admin", "news", "list"],
    queryFn: () => adminNewsApi.list({ page: 0, size: 100 }),
  });

  const { data: newsCategories } = useQuery({
    queryKey: ["admin", "news", "categories"],
    queryFn: () => adminNewsApi.listCategories(),
  });

  const { data: pendingDocs, isLoading: pendingDocsLoading } = useQuery({
    queryKey: ["admin", "documents", "pending"],
    queryFn: adminDocumentsApi.listPending,
  });

  const invalidateNews = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
    queryClient.invalidateQueries({ queryKey: ["news"] });
  };

  const pinMutation = useMutation({
    mutationFn: ({ id, pin }: { id: number; pin: boolean }) =>
      pin ? adminNewsApi.pin(id) : adminNewsApi.unpin(id),
    onSuccess: () => {
      invalidateNews();
      toast.success("Updated pin status");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminNewsApi.delete(id),
    onSuccess: () => {
      invalidateNews();
      setDeleteId(null);
      toast.success("Article deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: number;
      body: { title: string; summary: string; categoryId: number };
    }) => adminNewsApi.update(id, body),
    onSuccess: () => {
      invalidateNews();
      setEditItem(null);
      toast.success("Article updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredNews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = newsPage?.content ?? [];
    if (!q) return list;
    return list.filter(
      (n) =>
        (n.title ?? "").toLowerCase().includes(q) ||
        (n.summary ?? "").toLowerCase().includes(q) ||
        (n.content ?? "").toLowerCase().includes(q)
    );
  }, [newsPage, searchQuery]);

  const openEdit = (item: NewsItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditSummary(item.summary ?? "");
    setEditCategoryId(String(item.categoryId ?? ""));
  };

  const saveEdit = () => {
    if (!editItem) return;
    const cat = Number(editCategoryId);
    if (!editTitle.trim() || !Number.isFinite(cat) || cat < 1) {
      toast.error("Title and category are required");
      return;
    }
    updateMutation.mutate({
      id: editItem.id,
      body: { title: editTitle.trim(), summary: editSummary.trim(), categoryId: cat },
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Content management</h1>
            <p className="text-slate-600">
              Manage news articles and the document approval queue. Uses live APIs via the gateway.
            </p>
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white" asChild>
            <Link to="/admin/news/new" className="inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Create news
            </Link>
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search news…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-slate-300 text-slate-900"
          />
        </div>

        <Tabs defaultValue="news" className="space-y-4">
          <TabsList className="bg-slate-100 border border-slate-200">
            <TabsTrigger value="news" className="data-[state=active]:bg-white">
              <Newspaper className="h-4 w-4 mr-2" />
              News articles
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-white">
              <FileText className="h-4 w-4 mr-2" />
              Documents ({pendingDocs?.length ?? 0} pending)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="news">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left p-4 text-slate-600 font-medium">Title</th>
                      <th className="text-left p-4 text-slate-600 font-medium">Category</th>
                      <th className="text-left p-4 text-slate-600 font-medium">Pinned</th>
                      <th className="text-right p-4 text-slate-600 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newsLoading ? (
                      <tr>
                        <td className="p-4" colSpan={4}>
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-2/3" />
                            <Skeleton className="h-5 w-1/2" />
                          </div>
                        </td>
                      </tr>
                    ) : newsError ? (
                      <tr>
                        <td className="p-6 text-slate-600" colSpan={4}>
                          Failed to load news. Ensure you have NEWS admin permission and the News service is
                          running.
                        </td>
                      </tr>
                    ) : filteredNews.length === 0 ? (
                      <tr>
                        <td className="p-6 text-slate-600" colSpan={4}>
                          No news found.
                        </td>
                      </tr>
                    ) : (
                      filteredNews.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="p-4">
                            <p className="text-slate-900 font-medium">{item.title}</p>
                          </td>
                          <td className="p-4 text-slate-700">{item.categoryName || item.categoryId || "—"}</td>
                          <td className="p-4 text-slate-700">{item.pinned ? "Yes" : "No"}</td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="p-2 hover:bg-slate-100 rounded-lg">
                                  <MoreVertical className="h-4 w-4 text-slate-500" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border-slate-200">
                                <DropdownMenuItem className="text-slate-800 focus:bg-slate-100" asChild>
                                  <Link to={`/news/${item.id}`}>
                                    <Eye className="h-4 w-4 mr-2" /> View
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-slate-800 focus:bg-slate-100"
                                  onClick={() => openEdit(item)}
                                >
                                  <Edit className="h-4 w-4 mr-2" /> Quick edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-slate-800 focus:bg-slate-100"
                                  disabled={pinMutation.isPending}
                                  onClick={() =>
                                    pinMutation.mutate({ id: item.id, pin: !item.pinned })
                                  }
                                >
                                  {item.pinned ? (
                                    <>
                                      <PinOff className="h-4 w-4 mr-2" /> Unpin
                                    </>
                                  ) : (
                                    <>
                                      <Pin className="h-4 w-4 mr-2" /> Pin
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 focus:bg-red-50"
                                  onClick={() => setDeleteId(item.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-slate-900 font-semibold">Document approvals</p>
                    <p className="text-slate-600 text-sm">
                      Pending:{" "}
                      <span className="font-semibold">
                        {pendingDocsLoading ? "…" : (pendingDocs?.length ?? 0)}
                      </span>
                    </p>
                  </div>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white" asChild>
                    <Link to="/admin/documents">Review &amp; approve</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteId != null} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent className="bg-white border-slate-200">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this article?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600">
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-300">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteId != null && deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={editItem != null} onOpenChange={(o) => !o && setEditItem(null)}>
          <DialogContent className="bg-white border-slate-200 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit article</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-slate-700">Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700">Summary</Label>
                <Input
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700">Category</Label>
                <Select
                  value={editCategoryId || undefined}
                  onValueChange={setEditCategoryId}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    {(newsCategories ?? []).map((c: NewsCategory) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-slate-300" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
