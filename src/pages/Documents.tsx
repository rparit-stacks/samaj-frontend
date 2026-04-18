import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Download, Eye, Calendar, Filter, Plus, Loader2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentViewerDialog } from "@/components/dialogs/DocumentViewerDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { documentsApi, cloudApi, type DocumentDto } from "@/lib/api";

const CATEGORIES = [
  { id: "all", label: "All Documents" },
  { id: "notices", label: "Notices" },
  { id: "forms", label: "Forms" },
  { id: "legal", label: "Legal" },
  { id: "educational", label: "Educational" },
  { id: "financial", label: "Financial" },
];

const categoryColors: Record<string, string> = {
  notices: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  forms: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  legal: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  educational: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  financial: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300",
};

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type SortOption = "dateDesc" | "dateAsc" | "downloadsDesc" | "nameAsc";

export default function Documents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("dateDesc");
  const [selectedDocument, setSelectedDocument] = useState<DocumentDto | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", searchQuery || undefined, selectedCategory !== "all" ? selectedCategory : undefined],
    queryFn: () =>
      documentsApi.list({
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
      }),
  });

  const filteredAndSorted = useMemo(() => {
    let list = [...documents];
    if (sortBy === "dateDesc") list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortBy === "dateAsc") list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sortBy === "downloadsDesc") list.sort((a, b) => b.downloadCount - a.downloadCount);
    else if (sortBy === "nameAsc") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [documents, sortBy]);

  const handleView = (doc: DocumentDto) => {
    setSelectedDocument(doc);
    setViewerOpen(true);
  };

  const handleDownload = async (doc: DocumentDto) => {
    setDownloadId(doc.id);
    try {
      const res = await documentsApi.downloadFile(doc.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName || doc.title || "document";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded", description: doc.title });
    } catch (e) {
      toast({
        title: "Download failed",
        description: e instanceof Error ? e.message : "Try opening in new tab.",
        variant: "destructive",
      });
    } finally {
      setDownloadId(null);
    }
  };

  return (
    <AppLayout title="Documents">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">Official forms, notices, and resources</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/documents/me" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                My Documents
              </Link>
            </Button>
            <Button onClick={() => setUploadOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dateDesc">Newest first</SelectItem>
              <SelectItem value="dateAsc">Oldest first</SelectItem>
              <SelectItem value="downloadsDesc">Most downloads</SelectItem>
              <SelectItem value="nameAsc">Name A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-4 px-6 font-semibold text-sm">Document</th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">Category</th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">Date</th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">Downloads</th>
                  <th className="text-right py-4 px-6 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : filteredAndSorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No documents found</p>
                    </td>
                  </tr>
                ) : (
                  filteredAndSorted.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.fileType || "File"} • {formatFileSize(doc.fileSize)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className={cn("text-xs", categoryColors[doc.category.toLowerCase()] || "")}>
                          {doc.category}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{formatDate(doc.createdAt)}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{doc.downloadCount}</td>
                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleView(doc)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadId === doc.id}
                          >
                            {downloadId === doc.id ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            Download
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-border">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : filteredAndSorted.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No documents found</p>
              </div>
            ) : (
              filteredAndSorted.map((doc) => (
                <div key={doc.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-xs", categoryColors[doc.category.toLowerCase()] || "")}>
                          {doc.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {doc.fileType || "File"} • {formatFileSize(doc.fileSize)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(doc.createdAt)} · {doc.downloadCount} downloads
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleView(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadId === doc.id}
                      >
                        {downloadId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <DocumentViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        document={selectedDocument || undefined}
        onDownload={() => selectedDocument && handleDownload(selectedDocument)}
      />

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["documents"] });
          setUploadOpen(false);
        }}
        toast={toast}
      />
    </AppLayout>
  );
}

function UploadDocumentDialog({
  open,
  onOpenChange,
  onSuccess,
  toast,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("notices");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const createMutation = useMutation({
    mutationFn: documentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onSuccess();
      setTitle("");
      setDescription("");
      setCategory("notices");
      setVisibility("PUBLIC");
      setFile(null);
    },
    onError: (e) => {
      toast({ title: "Failed to add document", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !category.trim()) {
      toast({ title: "Fill title, category, and choose a file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const { url } = await cloudApi.uploadDocument(file);
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || null,
        category: category.trim(),
        visibility,
      });
      toast({
        title: "Document uploaded",
        description:
          "Your file is pending admin review. You can open it from My Documents; public library listing happens after approval.",
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" className="mt-1" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" className="mt-1" />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Visibility *</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "PUBLIC" | "PRIVATE")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public (library after admin approval)</SelectItem>
                <SelectItem value="PRIVATE">Private (only you; still reviewed by admins)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>File *</Label>
            <Input
              type="file"
              className="mt-1"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.rtf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
