import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Image as ImageIcon,
  X,
  MapPin,
  Tag,
  Smile,
  Plus,
  Loader2,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  communityApi,
  cloudApi,
  userApi,
  type CommunityPost,
  type CommunityPostMedia,
  type UserProfile,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { TagPicker } from "@/components/ui/tag-picker";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (post: CommunityPost) => void;
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=12`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        state?: string;
        state_district?: string;
      };
      name?: string;
    };
    const a = data.address ?? {};
    const place = a.city || a.town || a.village || a.suburb || data.name;
    const region = a.state || a.state_district;
    const label = [place, region].filter(Boolean).join(", ");
    return label || null;
  } catch {
    return null;
  }
}

function detectDeviceLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}

export function CreatePostDialog({ open, onOpenChange, onCreated }: CreatePostDialogProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [emojiCodes, setEmojiCodes] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [locStatus, setLocStatus] = useState<"idle" | "detecting" | "done" | "denied">("idle");
  const [tags, setTags] = useState<string[]>([]);
  const [showTags, setShowTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoLocRequested = useRef(false);

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: userApi.getProfile,
    enabled: !!user,
  });

  const name =
    profile?.fullName ||
    (user?.metadata?.name as string) ||
    user?.email?.split("@")[0] ||
    "You";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  const avatarUrl = profile?.avatarUrl ?? undefined;
  const profileCity = profile?.city?.trim() || "";

  const applyAutoLocation = async () => {
    setLocStatus("detecting");
    try {
      const { lat, lon } = await detectDeviceLocation();
      const label = await reverseGeocode(lat, lon);
      if (label) {
        setLocation(label);
        setLocStatus("done");
        return;
      }
      if (profileCity) {
        setLocation(profileCity);
        setLocStatus("done");
        return;
      }
      setLocation(`${lat.toFixed(3)}, ${lon.toFixed(3)}`);
      setLocStatus("done");
    } catch {
      if (profileCity) {
        setLocation(profileCity);
        setLocStatus("done");
      } else {
        setLocStatus("denied");
      }
    }
  };

  useEffect(() => {
    if (!open) {
      autoLocRequested.current = false;
      return;
    }
    if (autoLocRequested.current) return;
    autoLocRequested.current = true;
    // Prefer profile city instantly, then refine with GPS.
    if (profileCity && !location) setLocation(profileCity);
    void applyAutoLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profileCity]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    const previews = selected.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...selected]);
    setFilePreviews((prev) => [...prev, ...previews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    filePreviews.forEach((url) => URL.revokeObjectURL(url));
    setContent("");
    setFiles([]);
    setFilePreviews([]);
    setEmojiCodes([]);
    setLocation("");
    setLocStatus("idle");
    setTags([]);
    setShowTags(false);
    autoLocRequested.current = false;
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handlePost = async () => {
    if ((!content.trim() && files.length === 0) || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const media: { url: string; type: "IMAGE" | "VIDEO"; sortOrder: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const uploaded = await cloudApi.uploadToFolder("community", files[i]);
        media.push({
          url: uploaded.url,
          type: files[i].type.startsWith("video") ? "VIDEO" : "IMAGE",
          sortOrder: i,
        });
      }

      const created = await communityApi.create({
        content: content.trim() || (files.length ? " " : ""),
        media,
        location: location.trim() || undefined,
        emojiCodes: emojiCodes.length ? emojiCodes : undefined,
        tags: tags.length ? tags : undefined,
        authorDisplayName: name || undefined,
        authorPhotoUrl: avatarUrl || undefined,
      });

      const localMedia: CommunityPostMedia[] = media.map((m, i) => ({
        id: -(i + 1),
        url: m.url,
        type: m.type,
        sortOrder: m.sortOrder,
      }));
      const finalPost: CommunityPost = {
        ...created,
        media: created.media?.length ? created.media : localMedia,
      };

      toast({ title: "Shared", description: "Your post is live." });
      onCreated?.(finalPost);
      handleClose();
    } catch (err: unknown) {
      toast({
        title: "Could not create post",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPost = Boolean(content.trim() || files.length > 0) && !isSubmitting;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
        else onOpenChange(true);
      }}
    >
      <SheetContent
        side="bottom"
        className={cn(
          "flex h-[min(92dvh,720px)] flex-col gap-0 rounded-t-3xl border-0 p-0",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          "[&>button]:hidden",
        )}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="space-y-0 border-b border-border/60 px-3 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-full px-3 text-muted-foreground"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <SheetTitle className="flex-1 text-center text-[15px] font-semibold tracking-tight">
              New post
            </SheetTitle>
            <Button
              type="button"
              size="sm"
              className="h-9 rounded-full px-4 font-semibold"
              disabled={!canPost}
              onClick={() => void handlePost()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Posting
                </>
              ) : (
                "Share"
              )}
            </Button>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-start gap-3 px-4 pt-4">
            <Avatar className="mt-0.5 h-11 w-11 shrink-0 ring-2 ring-border/50">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{name}</p>
              <button
                type="button"
                className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted"
                onClick={() => void applyAutoLocation()}
              >
                {locStatus === "detecting" ? (
                  <>
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
                    Detecting location…
                  </>
                ) : location ? (
                  <>
                    <MapPin className="h-3 w-3 shrink-0 text-primary" />
                    <span className="truncate">{location}</span>
                  </>
                ) : (
                  <>
                    <Navigation className="h-3 w-3 shrink-0" />
                    Add location
                  </>
                )}
              </button>
            </div>
          </div>

          <Textarea
            autoFocus
            placeholder="What's happening in the community?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none border-0 bg-transparent px-4 py-3 text-[15px] leading-relaxed focus-visible:ring-0 placeholder:text-muted-foreground/55"
            maxLength={500}
          />

          {files.length > 0 && (
            <div
              className={cn(
                "grid gap-1.5 px-4 pb-3",
                files.length === 1 ? "grid-cols-1" : "grid-cols-2",
              )}
            >
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative overflow-hidden rounded-2xl bg-muted"
                  style={{ aspectRatio: files.length === 1 ? "4/5" : "1/1" }}
                >
                  {file.type.startsWith("video") ? (
                    <video className="h-full w-full object-cover" src={filePreviews[i]} muted />
                  ) : (
                    <img className="h-full w-full object-cover" src={filePreviews[i]} alt="" />
                  )}
                  <button
                    type="button"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white"
                    onClick={() => handleRemoveFile(i)}
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                style={{ aspectRatio: files.length === 1 ? undefined : "1/1" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="h-5 w-5" />
                <span className="text-[11px] font-medium">Add</span>
              </button>
            </div>
          )}

          {emojiCodes.length > 0 && (
            <div className="flex flex-wrap gap-1 px-4 pb-2 text-xl">
              {emojiCodes.map((code, i) => (
                <button
                  key={`${code}-${i}`}
                  type="button"
                  className="transition-opacity hover:opacity-60"
                  onClick={() => setEmojiCodes((prev) => prev.filter((_, j) => j !== i))}
                >
                  {code}
                </button>
              ))}
            </div>
          )}

          {showTags && (
            <div className="space-y-2 border-t border-border/50 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </div>
              <TagPicker value={tags} onChange={setTags} placeholder="Add tags…" />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 rounded-full pl-2.5 pr-1.5 text-xs">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                        aria-label={`Remove #${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom composer tools */}
        <div className="shrink-0 border-t border-border/60 px-2 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFilesSelected}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                title="Photo / video"
              >
                <ImageIcon className="h-5 w-5 text-emerald-600" />
              </Button>
              <EmojiPicker
                onSelect={(emoji) => {
                  setContent((prev) => prev + emoji);
                  setEmojiCodes((prev) => [...prev, emoji]);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => void applyAutoLocation()}
                title="Refresh location"
              >
                <MapPin className={cn("h-5 w-5", location ? "text-primary" : "text-rose-500")} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-10 w-10 rounded-full", showTags && "bg-muted")}
                onClick={() => setShowTags((v) => !v)}
                title="Tags"
              >
                <Tag className="h-5 w-5 text-sky-600" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setContent((prev) => prev + " 😊")}
                title="Feeling"
              >
                <Smile className="h-5 w-5 text-amber-500" />
              </Button>
            </div>
            <span
              className={cn(
                "pr-2 text-xs tabular-nums",
                content.length > 450 ? "font-semibold text-destructive" : "text-muted-foreground",
              )}
            >
              {content.length}/500
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
