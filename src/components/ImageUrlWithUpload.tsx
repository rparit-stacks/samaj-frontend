import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { adminCloudApi, cloudApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ImageUrlWithUploadAuth = "user" | "admin";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Server upload folder (e.g. banners, news, history, achievements, cms). */
  folder: string;
  auth: ImageUrlWithUploadAuth;
  optional?: boolean;
  helperText?: string;
  className?: string;
  inputClassName?: string;
};

export function ImageUrlWithUpload({
  id = "image-url-field",
  label,
  value,
  onChange,
  folder,
  auth,
  optional,
  helperText,
  className,
  inputClassName,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const res =
        auth === "admin"
          ? await adminCloudApi.uploadToFolder(folder, file)
          : await cloudApi.uploadToFolder(folder, file);
      onChange(res.url);
      toast.success("Image uploaded", { description: res.provider === "CLOUDINARY" ? "Saved to Cloudinary" : "Saved" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <Label htmlFor={id}>
          {label}
          {!optional && " *"}
        </Label>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 rounded-full" disabled={busy} onClick={pick}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </Button>
        </div>
      </div>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://… or use Upload"
        className={cn(inputClassName)}
      />
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      {value.trim().startsWith("http") && (
        <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/30 max-h-40">
          <img src={value} alt="" className="w-full max-h-40 object-contain" />
        </div>
      )}
    </div>
  );
}
