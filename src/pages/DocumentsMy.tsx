import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Download, Eye, Calendar, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentViewerDialog } from "@/components/dialogs/DocumentViewerDialog";
import { useToast } from "@/hooks/use-toast";
import { documentsApi, type DocumentDto } from "@/lib/api";

const CATEGORIES = [
  { id: "all", label: "All" },
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

export default function DocumentsMy() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState<DocumentDto | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", "me"],
    queryFn: documentsApi.listMine,
  });

  const filtered = documents.filter((doc) => {
    const matchSearch = !searchQuery.trim() || doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === "all" || doc.category.toLowerCase() === selectedCategory;
    return matchSearch && matchCat;
  });

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
    <AppLayout title="My Documents">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" className="w-fit gap-2" asChild>
            <Link to="/documents">
              <ChevronLeft className="h-4 w-4" />
              Back to Documents
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">My Documents</h1>
          <p className="text-muted-foreground">
            All uploads are reviewed by admins. You always see your own files; public listings require approval.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search your documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
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
                  <th className="text-left py-4 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-sm">Date</th>
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
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No documents yet</p>
                      <Button variant="link" asChild className="mt-2">
                        <Link to="/documents">Upload a document</Link>
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filtered.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/30">
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
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {doc.visibility === "PRIVATE" ? (
                              <Badge variant="outline" className="border-slate-400 text-slate-700 dark:text-slate-200">
                                Private
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-blue-200 text-blue-800 bg-blue-50/80">
                                Public
                              </Badge>
                            )}
                            {doc.approved ? (
                              <Badge className="bg-green-600 hover:bg-green-600 text-xs">Approved</Badge>
                            ) : doc.rejectionReason ? (
                              <Badge variant="destructive" className="text-xs">Rejected</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 bg-amber-500/10">
                                Pending review
                              </Badge>
                            )}
                          </div>
                          {doc.rejectionReason && (
                            <p className="text-xs text-muted-foreground max-w-[220px]" title={doc.rejectionReason}>
                              {doc.rejectionReason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">{formatDate(doc.createdAt)}</td>
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
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No documents yet</p>
                <Button variant="link" asChild><Link to="/documents">Upload a document</Link></Button>
              </div>
            ) : (
              filtered.map((doc) => (
                <div key={doc.id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{doc.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="outline" className={cn("text-xs", categoryColors[doc.category.toLowerCase()] || "")}>
                          {doc.category}
                        </Badge>
                        {doc.visibility === "PRIVATE" ? (
                          <Badge variant="outline" className="text-xs border-slate-400 text-slate-700 dark:text-slate-200">
                            Private
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-blue-200 text-blue-800 bg-blue-50/80">
                            Public
                          </Badge>
                        )}
                        {doc.approved ? (
                          <Badge className="bg-green-600 text-xs">Approved</Badge>
                        ) : doc.rejectionReason ? (
                          <Badge variant="destructive" className="text-xs">Rejected</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {doc.rejectionReason && (
                        <p className="text-xs text-muted-foreground mt-1">{doc.rejectionReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(doc.createdAt)}
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
    </AppLayout>
  );
}
