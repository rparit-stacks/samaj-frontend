import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Share2, Printer, FileText, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DocumentDto } from "@/lib/api";

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

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: DocumentDto | null;
  onDownload?: () => void;
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  document: doc,
  onDownload,
}: DocumentViewerDialogProps) {
  const { toast } = useToast();

  if (!doc) return null;

  const handleOpenInNewTab = () => {
    window.open(doc.fileUrl, "_blank");
    toast({ title: "Opened in new tab" });
  };

  const handlePrint = () => {
    const w = window.open(doc.fileUrl, "_blank");
    if (w) {
      w.onload = () => {
        w.print();
        w.onafterprint = () => w.close();
      };
    } else {
      toast({ title: "Allow popups to print", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: doc.title,
          url: doc.fileUrl,
          text: doc.description || doc.title,
        });
        toast({ title: "Shared successfully" });
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(doc.fileUrl);
          toast({ title: "Link copied to clipboard" });
        }
      }
    } else {
      await navigator.clipboard.writeText(doc.fileUrl);
      toast({ title: "Link copied to clipboard" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {doc.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 flex-wrap gap-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Category: </span>
              <span className="font-medium">{doc.category}</span>
              <span className="text-muted-foreground ml-4">Date: </span>
              <span className="font-medium">{formatDate(doc.createdAt)}</span>
              <span className="text-muted-foreground ml-4">Size: </span>
              <span className="font-medium">{formatFileSize(doc.fileSize)}</span>
              <span className="text-muted-foreground ml-4">Downloads: </span>
              <span className="font-medium">{doc.downloadCount}</span>
            </div>
          </div>

          <div className="aspect-[4/3] bg-muted/30 rounded-xl flex items-center justify-center border-2 border-dashed border-border">
            <div className="text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Preview not available</p>
              <p className="text-sm text-muted-foreground mt-1">
                {doc.fileType || "File"} • {formatFileSize(doc.fileSize)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={onDownload ?? (() => {})} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleShare} className="flex-1 sm:flex-none">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleOpenInNewTab} className="flex-1 sm:flex-none">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
