import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userApi } from "@/lib/api";
import { ImageUploadField } from "@/components/ImageUploadField";

interface ChangeBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl?: string | null;
  /** Called after a successful save with the new cover URL (or null if removed). */
  onUpdated?: (nextUrl: string | null) => void;
}

export function ChangeBackgroundDialog({
  open,
  onOpenChange,
  currentUrl,
  onUpdated,
}: ChangeBackgroundDialogProps) {
  const [url, setUrl] = useState(currentUrl || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setUrl(currentUrl || "");
  }, [open, currentUrl]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const next = url.trim() || null;
      await userApi.updateProfile({ coverImageUrl: next });
      toast({ title: "Cover updated", description: "Your cover photo has been saved." });
      onUpdated?.(next);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update cover",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Cover photo
          </DialogTitle>
          <DialogDescription>Upload a wide photo for your profile cover.</DialogDescription>
        </DialogHeader>
        <div className="py-1">
          <ImageUploadField
            value={url}
            onChange={setUrl}
            folder="background"
            auth="user"
            variant="cover"
            label="Cover"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || url === (currentUrl || "")}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
