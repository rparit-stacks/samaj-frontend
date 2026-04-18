import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCommunityApi, type CommunityPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Pencil, Flag, Tags, MessageSquare, Eye, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserQuickProfileDialog } from "@/components/admin/UserQuickProfileDialog";

function initialsOf(name?: string | null): string {
  const v = (name ?? "").trim();
  if (!v) return "U";
  return v
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0]!)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AdminCommunity() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string>("");
  const [edit, setEdit] = useState<CommunityPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newTag, setNewTag] = useState("");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const { data: tags } = useQuery({
    queryKey: ["community", "tags", "top"],
    queryFn: () => adminCommunityApi.topTags(50),
  });

  const { data: postsPage, isLoading: postsLoading } = useQuery({
    queryKey: ["admin", "community", "posts", { q, tag }],
    queryFn: () => adminCommunityApi.listPosts({ page: 0, size: 30, q: q || undefined, tag: tag || undefined }),
  });

  const { data: reportsPage, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin", "community", "reports"],
    queryFn: () => adminCommunityApi.listReports({ page: 0, size: 30, status: "OPEN" }),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => adminCommunityApi.deletePost(id),
    onSuccess: async () => {
      toast.success("Post deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "community", "posts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const updatePostMutation = useMutation({
    mutationFn: async () => {
      if (!edit) return;
      await adminCommunityApi.updatePost(edit.id, { content: editContent });
    },
    onSuccess: async () => {
      toast.success("Post updated");
      setEdit(null);
      await qc.invalidateQueries({ queryKey: ["admin", "community", "posts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const createTagMutation = useMutation({
    mutationFn: async () => adminCommunityApi.createTag(newTag.trim()),
    onSuccess: async () => {
      toast.success("Tag created");
      setNewTag("");
      await qc.invalidateQueries({ queryKey: ["community", "tags", "top"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Tag create failed"),
  });

  const reviewReportMutation = useMutation({
    mutationFn: async (p: { id: number; status: "RESOLVED" | "DISMISSED" }) => adminCommunityApi.reviewReport(p.id, p.status),
    onSuccess: async () => {
      toast.success("Report reviewed");
      await qc.invalidateQueries({ queryKey: ["admin", "community", "reports"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Review failed"),
  });

  const posts = postsPage?.content ?? [];
  const openReports = reportsPage?.content ?? [];

  const tagOptions = useMemo(() => (tags ?? []).map((t) => t.slug), [tags]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Community</h1>
          <p className="text-slate-600">Admin moderation (real backend data, full CRUD)</p>
        </div>

        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList className="bg-slate-100 border border-slate-200">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Flag className="h-4 w-4" /> Reports
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Tags className="h-4 w-4" /> Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">Manage posts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Search</Label>
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search by content/location..."
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Tag slug</Label>
                    <Input
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      list="tag-slugs"
                      placeholder="e.g. announcements"
                      className="bg-white border-slate-300 text-slate-900"
                    />
                    <datalist id="tag-slugs">
                      {tagOptions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {postsLoading ? (
                  <p className="text-slate-500 text-sm">Loading…</p>
                ) : posts.length === 0 ? (
                  <p className="text-slate-500 text-sm">No posts found.</p>
                ) : (
                  <div className="space-y-3">
                    {posts.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            className="flex items-center gap-3 min-w-0 text-left"
                            onClick={() => {
                              setProfileUserId(p.authorUserId);
                              setProfileOpen(true);
                            }}
                          >
                            <Avatar className="h-10 w-10 border border-slate-200 bg-slate-100">
                              <AvatarImage src={p.authorPhotoUrl ?? undefined} />
                              <AvatarFallback className="bg-slate-200 text-slate-700">
                                {initialsOf(p.authorDisplayName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-slate-900 text-sm font-semibold truncate">
                                {p.authorDisplayName || "Member"}
                              </p>
                              <p className="text-slate-500 text-xs truncate">
                                {p.createdAt}
                              </p>
                            </div>
                          </button>

                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              variant="outline"
                              className="border-slate-300 text-slate-700 hover:bg-slate-50"
                              onClick={() => {
                                setEdit(p);
                                setEditContent(p.content);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deletePostMutation.mutate(p.id)}
                              disabled={deletePostMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-slate-800 text-sm mt-3 whitespace-pre-wrap break-words">
                          {p.content}
                        </p>

                        {p.media?.length ? (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {p.media
                              .filter((m) => m.type === "IMAGE")
                              .slice(0, 3)
                              .map((m) => (
                                <div key={m.id} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                  <img src={m.url} alt="" className="h-20 w-full object-cover" loading="lazy" />
                                </div>
                              ))}
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" /> {p.likeCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" /> {p.commentCount}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" /> {p.viewCount}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">Open reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportsLoading ? (
                  <p className="text-slate-500 text-sm">Loading…</p>
                ) : openReports.length === 0 ? (
                  <p className="text-slate-500 text-sm">No open reports.</p>
                ) : (
                  openReports.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg bg-slate-50 border border-slate-200 p-4 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-slate-900 text-sm font-medium">
                          Report #{r.id} • Post {r.postId}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">
                          {r.createdAt} • status: {r.status}
                        </p>
                        <p className="text-slate-700 text-sm mt-2 whitespace-pre-wrap break-words">
                          {r.reason || "(no reason)"} {r.details ? `— ${r.details}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          className="border-slate-300 text-slate-700 hover:bg-slate-50"
                          onClick={() => reviewReportMutation.mutate({ id: r.id, status: "DISMISSED" })}
                        >
                          Dismiss
                        </Button>
                        <Button onClick={() => reviewReportMutation.mutate({ id: r.id, status: "RESOLVED" })}>
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tags">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-900">Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-3 items-end">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Create tag</Label>
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="e.g. Announcements"
                      className="bg-white border-slate-300 text-slate-900"
                    />
                  </div>
                  <Button
                    onClick={() => createTagMutation.mutate()}
                    disabled={!newTag.trim() || createTagMutation.isPending}
                  >
                    Create
                  </Button>
                </div>

                <div className="space-y-2">
                  {(tags ?? []).map((t) => (
                    <div
                      key={t.id}
                      className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-slate-900 font-medium text-sm">{t.name}</p>
                        <p className="text-slate-500 text-xs">
                          slug: <code>{t.slug}</code> • posts: {t.postCount}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        disabled={t.postCount > 0}
                        onClick={async () => {
                          try {
                            await adminCommunityApi.deleteTag(t.id);
                            toast.success("Tag deleted");
                            await qc.invalidateQueries({ queryKey: ["community", "tags", "top"] });
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Delete failed");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                  {(tags ?? []).length === 0 ? (
                    <p className="text-slate-500 text-sm">No tags found.</p>
                  ) : null}
                  <p className="text-slate-500 text-xs">
                    Note: Tag deletion is disabled when it’s used by posts (unlink first).
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!edit} onOpenChange={(o) => (!o ? setEdit(null) : null)}>
          <DialogContent className="bg-white border-slate-200 text-slate-900">
            <DialogHeader>
              <DialogTitle>Edit post</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-slate-700">Content</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-slate-300" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button onClick={() => updatePostMutation.mutate()} disabled={updatePostMutation.isPending}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <UserQuickProfileDialog
          open={profileOpen}
          onOpenChange={(o) => {
            setProfileOpen(o);
            if (!o) setProfileUserId(null);
          }}
          userId={profileUserId}
        />
      </div>
    </AdminLayout>
  );
}

