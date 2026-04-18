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
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";

interface ChangeBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl?: string | null;
  onUpdated?: () => void;
}

export function ChangeBackgroundDialog({ open, onOpenChange, currentUrl, onUpdated }: ChangeBackgroundDialogProps) {
  const [url, setUrl] = useState(currentUrl || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setUrl(currentUrl || "");
  }, [open, currentUrl]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile({ coverImageUrl: url.trim() || null });
      toast({ title: "Background Updated", description: "Your cover image has been updated." });
      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update background",
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
            Change Background Image
          </DialogTitle>
          <DialogDescription>Paste an image URL or upload a file. The URL is saved to your profile.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <ImageUrlWithUpload
            id="cover-url"
            label="Cover image"
            optional
            value={url}
            onChange={setUrl}
            folder="background"
            auth="user"
            helperText="Uses the same cloud upload as other images (Cloudinary when configured)."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
