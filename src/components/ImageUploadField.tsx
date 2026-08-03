import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ImagePlus, Trash2 } from "lucide-react";
import { adminCloudApi, cloudApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ImageUploadAuth = "user" | "admin";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  auth: ImageUploadAuth;
  label?: string;
  /** Preview aspect — cover is wide, avatar is square */
  variant?: "cover" | "avatar";
  className?: string;
  /** Allow clearing the image */
  clearable?: boolean;
};

/**
 * Upload-only image control — preview + pick file. No raw URL field.
 */
export function ImageUploadField({
  value,
  onChange,
  folder,
  auth,
  label,
  variant = "cover",
  className,
  clearable = true,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const hasImage = Boolean(value?.trim());

  const pick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const res =
        auth === "admin"
          ? await adminCloudApi.uploadToFolder(folder, file)
          : folder === "background"
            ? await cloudApi.uploadBackgroundImage(file)
            : folder === "profile"
              ? await cloudApi.uploadProfileImage(file)
              : await cloudApi.uploadToFolder(folder, file);
      onChange(res.url);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e)}
      />

      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className={cn(
          "relative w-full overflow-hidden border border-dashed border-border/80 bg-muted/40",
          "flex flex-col items-center justify-center gap-2 transition-colors",
          "hover:bg-muted/70 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "disabled:opacity-60",
          variant === "avatar" ? "aspect-square max-w-[10rem] mx-auto rounded-full" : "aspect-[2.4/1] rounded-2xl",
        )}
      >
        {hasImage ? (
          <img
            src={value}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              variant === "avatar" && "rounded-full",
            )}
          />
        ) : null}

        <div
          className={cn(
            "relative z-10 flex flex-col items-center gap-1.5 px-3 py-4",
            hasImage && "rounded-xl bg-black/45 text-white px-4 py-3",
          )}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ImagePlus className={cn("h-6 w-6", hasImage ? "text-white" : "text-primary")} />
          )}
          <span className={cn("text-xs font-semibold", hasImage ? "text-white" : "text-foreground")}>
            {busy ? "Uploading…" : hasImage ? "Change photo" : "Upload photo"}
          </span>
        </div>
      </button>

      {hasImage && clearable && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground"
            disabled={busy}
            onClick={() => onChange("")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
