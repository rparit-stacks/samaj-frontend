import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminNewsApi, type NewsCategory } from "@/lib/api";
import { toast } from "sonner";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";

export default function AdminNewsCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState(true);
  const [publishedAtLocal, setPublishedAtLocal] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");

  const { data: categories, isLoading: catLoading } = useQuery({
    queryKey: ["admin", "news", "categories"],
    queryFn: () => adminNewsApi.listCategories(),
  });

  const createCategoryMutation = useMutation({
    mutationFn: () => {
      const name = newCategoryName.trim();
      if (!name) {
        return Promise.reject(new Error("Category name is required"));
      }
      const slug = newCategorySlug.trim() || undefined;
      return adminNewsApi.createCategory({ name, slug });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "news", "categories"] });
      setNewCategoryName("");
      setNewCategorySlug("");
      // Auto-select newly created category for the article form.
      setCategoryId(String(created.id));
      toast.success("Category created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const cat = Number(categoryId);
      if (!title.trim() || !summary.trim() || !content.trim() || !Number.isFinite(cat)) {
        return Promise.reject(new Error("Fill title, summary, body, and category"));
      }
      const publishedAt =
        publishedAtLocal.trim() === ""
          ? null
          : new Date(publishedAtLocal).toISOString();
      return adminNewsApi.create({
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        categoryId: cat,
        imageUrl: imageUrl.trim() === "" ? null : imageUrl.trim(),
        pinned,
        active,
        publishedAt,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "news"] });
      queryClient.invalidateQueries({ queryKey: ["news"] });
      toast.success("Article created");
      navigate("/admin/content");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-slate-600" asChild>
            <Link to="/admin/content">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create news</h1>
          <p className="text-slate-600 text-sm mt-1">
            Write the article, pick a category, and optionally schedule or pin it.
          </p>
        </div>

        {/* Quick create category (so you’re not blocked) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-medium text-slate-900">Quick create category</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1 md:col-span-1">
              <Label className="text-slate-700">Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Announcements"
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>
            <div className="space-y-1 md:col-span-1">
              <Label className="text-slate-700">Slug (optional)</Label>
              <Input
                value={newCategorySlug}
                onChange={(e) => setNewCategorySlug(e.target.value)}
                placeholder="announcements"
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>
            <div className="flex items-end md:col-span-1">
              <Button
                type="button"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                disabled={createCategoryMutation.isPending || !newCategoryName.trim()}
                onClick={() => createCategoryMutation.mutate()}
              >
                {createCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Add category"
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <Label className="text-slate-700">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 bg-white border-slate-300 text-slate-900"
            />
          </div>
          <div>
            <Label className="text-slate-700">Summary</Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="mt-1 bg-white border-slate-300 text-slate-900"
            />
          </div>
          <div>
            <Label className="text-slate-700">Body</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="mt-1 bg-white border-slate-300 text-slate-900 font-mono text-sm"
            />
          </div>
          <div>
            <Label className="text-slate-700">Category</Label>
            <Select
              value={categoryId || undefined}
              onValueChange={setCategoryId}
              disabled={catLoading}
            >
              <SelectTrigger className="mt-1 bg-white border-slate-300 text-slate-900">
                <SelectValue placeholder={catLoading ? "Loading…" : "Select category"} />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 text-slate-900">
                {(categories ?? []).map((c: NewsCategory) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ImageUrlWithUpload
            id="news-hero-image"
            label="Hero image"
            optional
            value={imageUrl}
            onChange={setImageUrl}
            folder="news"
            auth="admin"
            helperText="Optional cover image for the article list and detail page."
            inputClassName="mt-1 bg-white border-slate-300 text-slate-900"
          />
          <div>
            <Label className="text-slate-700">Publish date (optional)</Label>
            <Input
              type="datetime-local"
              value={publishedAtLocal}
              onChange={(e) => setPublishedAtLocal(e.target.value)}
              className="mt-1 bg-white border-slate-300 text-slate-900"
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-slate-700 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded border-slate-300"
              />
              Pinned
            </label>
            <label className="flex items-center gap-2 text-slate-700 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-slate-300"
              />
              Active (visible to users)
            </label>
          </div>
          <Button
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating…
              </>
            ) : (
              "Create article"
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
