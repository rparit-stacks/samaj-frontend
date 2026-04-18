import { useMemo, useState } from "react";
import {
  Search,
  Trash2,
  Image as ImageIcon,
  Edit2,
  Check,
  X,
  Loader2,
  Eye,
  MoreVertical,
  User,
  Calendar,
  Images,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
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
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGalleryApi, type AdminGalleryAlbumDto } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type StatusTab = "all" | "pending" | "approved";

export default function AdminGallery() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [editingAlbum, setEditingAlbum] = useState<AdminGalleryAlbumDto | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reviewAlbum, setReviewAlbum] = useState<AdminGalleryAlbumDto | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", approved: false, photoCount: 0 });
  const [actingId, setActingId] = useState<string | null>(null);

  const { data: albums, isLoading } = useQuery({
    queryKey: ["admin", "gallery", "list"],
    queryFn: () => adminGalleryApi.list(),
  });

  const stats = useMemo(() => {
    const list = albums ?? [];
    const pending = list.filter((a) => !a.approved).length;
    const approved = list.filter((a) => a.approved).length;
    return { total: list.length, pending, approved };
  }, [albums]);

  const filteredAlbums = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = albums ?? [];
    if (statusTab === "pending") list = list.filter((a) => !a.approved);
    if (statusTab === "approved") list = list.filter((a) => a.approved);
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.createdByName.toLowerCase().includes(q) ||
        a.createdById.toLowerCase().includes(q)
    );
  }, [albums, searchQuery, statusTab]);

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name: string; approved: boolean }) =>
      adminGalleryApi.update(data.id, {
        name: data.name,
        approved: data.approved,
      }),
    onMutate: ({ id }) => setActingId(id),
    onSettled: () => setActingId(null),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery"] });
      toast({ title: "Album updated" });
      setEditDialogOpen(false);
      setEditingAlbum(null);
      setReviewAlbum((cur) => (cur && cur.id === data.id ? data : cur));
    },
    onError: (err) => {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminGalleryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "gallery"] });
      toast({ title: "Album deleted" });
      setDeleteDialogOpen(false);
      setAlbumToDelete(null);
      setReviewOpen(false);
      setReviewAlbum(null);
    },
    onError: (err) => {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    },
  });

  const openReview = (album: AdminGalleryAlbumDto) => {
    setReviewAlbum(album);
    setReviewOpen(true);
  };

  const handleEdit = (album: AdminGalleryAlbumDto) => {
    setEditingAlbum(album);
    setEditForm({ name: album.name, approved: album.approved, photoCount: album.photoCount });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingAlbum || !editForm.name.trim()) {
      toast({ title: "Album name is required", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: editingAlbum.id,
      name: editForm.name.trim(),
      approved: editForm.approved,
    });
  };

  const setApproved = (album: AdminGalleryAlbumDto, approved: boolean) => {
    updateMutation.mutate({ id: album.id, name: album.name, approved });
  };

  const displayUrls = (a: AdminGalleryAlbumDto) => {
    const urls = a.photoUrls?.length ? a.photoUrls : [];
    if (urls.length) return urls;
    if (a.coverPhotoUrl) return [a.coverPhotoUrl];
    return [];
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gallery moderation</h1>
          <p className="text-slate-600 mt-1">
            Browse every photo in each album, then approve or reject before it appears in the community gallery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-slate-200">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Images className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Total albums</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200/80 bg-amber-50/40">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{stats.pending}</p>
                <p className="text-xs text-amber-800/80">Pending review</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200/80 bg-emerald-50/40">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">{stats.approved}</p>
                <p className="text-xs text-emerald-800/80">Approved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Albums</CardTitle>
              <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as StatusTab)} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3 sm:w-[320px]">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by album name or creator email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-xl" />
                ))}
              </div>
            ) : filteredAlbums.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <ImageIcon className="w-14 h-14 mx-auto mb-3 opacity-35" />
                <p className="font-medium">No albums match</p>
                <p className="text-sm mt-1">Try another tab or clear the search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAlbums.map((album) => {
                  const thumbs = displayUrls(album);
                  const busy = actingId === album.id && updateMutation.isPending;
                  return (
                    <Card
                      key={album.id}
                      className={cn(
                        "overflow-hidden border-slate-200 transition-shadow hover:shadow-md",
                        !album.approved && "ring-2 ring-amber-200/80"
                      )}
                    >
                      <div className="relative aspect-[4/3] bg-slate-100">
                        {thumbs[0] ? (
                          <img
                            src={thumbs[0]}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <ImageIcon className="h-12 w-12 opacity-40" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                          {album.approved ? (
                            <Badge className="bg-emerald-600/95 text-white border-0 shadow-sm">Approved</Badge>
                          ) : (
                            <Badge className="bg-amber-500/95 text-white border-0 shadow-sm">Pending</Badge>
                          )}
                          <Badge variant="secondary" className="bg-black/55 text-white border-0 text-xs">
                            {album.photoCount} photos
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{album.name}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate" title={album.createdByName}>
                            <User className="h-3 w-3 shrink-0" />
                            {album.createdByName}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {formatDate(album.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="flex-1 min-w-[8rem] bg-slate-900 hover:bg-slate-800 text-white"
                            onClick={() => openReview(album)}
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            Review &amp; photos
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="px-2">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(album)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit name / status
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setAlbumToDelete(album.id);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete album
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex gap-2">
                          {!album.approved ? (
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={busy}
                              onClick={() => setApproved(album, true)}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                              Approve
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-amber-300 text-amber-900"
                              disabled={busy}
                              onClick={() => setApproved(album, false)}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                              Unapprove
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review: full album + all images + approve */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-[min(100vw-1.5rem,56rem)] max-h-[min(92vh,900px)] flex flex-col p-0 gap-0 overflow-hidden">
          {reviewAlbum && (
            <>
              <DialogHeader className="p-5 pb-3 border-b bg-slate-50/80 text-left space-y-1">
                <DialogTitle className="text-xl pr-8 leading-tight">{reviewAlbum.name}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {reviewAlbum.createdByName}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>{formatDate(reviewAlbum.createdAt)}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-xs">{reviewAlbum.id}</span>
                </DialogDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                  {reviewAlbum.approved ? (
                    <Badge className="bg-emerald-600 text-white">Approved — visible in app</Badge>
                  ) : (
                    <Badge className="bg-amber-500 text-white">Pending — hidden from public gallery</Badge>
                  )}
                  <Badge variant="outline">{reviewAlbum.photoCount} images</Badge>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-0 max-h-[55vh] sm:max-h-[60vh]">
                <div className="p-4 sm:p-5">
                  {displayUrls(reviewAlbum).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">This album has no photos yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {displayUrls(reviewAlbum).map((url, i) => (
                        <a
                          key={`${url}-${i}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square overflow-hidden rounded-lg border bg-slate-100 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          <img
                            src={url}
                            alt={`Photo ${i + 1}`}
                            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            Open
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator />

              <DialogFooter className="p-4 sm:p-5 flex-col sm:flex-row gap-2 bg-slate-50/80 border-t">
                <div className="flex flex-1 flex-wrap gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={() => handleEdit(reviewAlbum)} className="flex-1 sm:flex-none">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit details
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 flex-1 sm:flex-none"
                    onClick={() => {
                      setAlbumToDelete(reviewAlbum.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
                <div className="flex flex-1 gap-2 justify-end w-full sm:w-auto">
                  {reviewAlbum.approved ? (
                    <Button
                      variant="outline"
                      className="border-amber-300"
                      disabled={actingId === reviewAlbum.id && updateMutation.isPending}
                      onClick={() => setApproved(reviewAlbum, false)}
                    >
                      {actingId === reviewAlbum.id && updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Unapprove
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[8rem]"
                      disabled={actingId === reviewAlbum.id && updateMutation.isPending}
                      onClick={() => setApproved(reviewAlbum, true)}
                    >
                      {actingId === reviewAlbum.id && updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Approve album
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit album</DialogTitle>
          </DialogHeader>
          {editingAlbum && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Album name</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Album name"
                />
              </div>
              <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-600 space-y-1">
                <p>
                  <span className="font-medium text-slate-800">Creator:</span> {editingAlbum.createdByName}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Photos:</span> {editForm.photoCount}
                </p>
                <p>
                  <span className="font-medium text-slate-800">Created:</span> {formatDate(editingAlbum.createdAt)}
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/80 p-3">
                <Label htmlFor="approved" className="text-sm cursor-pointer">
                  Approved (visible in gallery)
                </Label>
                <Switch
                  id="approved"
                  checked={editForm.approved}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, approved: checked })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this album?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. Every photo in the album will be removed from the server.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => albumToDelete && deleteMutation.mutate(albumToDelete)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
