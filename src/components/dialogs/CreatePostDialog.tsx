import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image, X, ArrowLeft, MapPin, Tag, Smile, Plus, ChevronRight } from "lucide-react";
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
import { LocationPicker } from "@/components/ui/location-picker";
import { TagPicker } from "@/components/ui/tag-picker";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (post: CommunityPost) => void;
}

export function CreatePostDialog({ open, onOpenChange, onCreated }: CreatePostDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [emojiCodes, setEmojiCodes] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const city = profile?.city || "";

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
    setStep(1);
    setContent("");
    setFiles([]);
    setFilePreviews([]);
    setEmojiCodes([]);
    setLocation("");
    setTags([]);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handlePost = async () => {
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Upload each file and collect media items
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
        content: content.trim(),
        media,
        location: location.trim() || undefined,
        emojiCodes: emojiCodes.length ? emojiCodes : undefined,
        tags: tags.length ? tags : undefined,
        authorDisplayName: name || undefined,
        authorPhotoUrl: avatarUrl || undefined,
      });

      // If the API response omits media (backend may not echo it back),
      // patch the local upload results so the post renders images immediately.
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

      toast({ title: "Post shared!", description: "Your post is live on the community wall." });
      onCreated?.(finalPost);
      handleClose();
    } catch (err: any) {
      toast({
        title: "Could not create post",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="p-0 gap-0 sm:max-w-lg overflow-hidden rounded-2xl">

        {/* ── Header bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center h-14 border-b px-3 shrink-0 gap-2">
          {step === 2 ? (
            <Button variant="ghost" size="icon" className="rounded-xl shrink-0" onClick={() => setStep(1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground" onClick={handleClose}>
              Cancel
            </Button>
          )}

          <span className="flex-1 text-center text-sm font-semibold">
            {step === 1 ? "Create Post" : "Add Details"}
          </span>

          {step === 1 ? (
            <Button
              size="sm"
              className="rounded-xl gap-1 shrink-0"
              disabled={!content.trim()}
              onClick={() => setStep(2)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-xl shrink-0"
              disabled={!content.trim() || isSubmitting}
              onClick={handlePost}
            >
              {isSubmitting ? "Posting…" : "Post"}
            </Button>
          )}
        </div>

        {/* ── Step 1: Content + Media ───────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="overflow-y-auto" style={{ maxHeight: "65vh" }}>
              {/* Author info */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-1">
                <Avatar className="h-10 w-10 shrink-0">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">{name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {city ? `${city} · ` : ""}Share with your community
                  </p>
                </div>
              </div>

              {/* Content textarea */}
              <Textarea
                autoFocus
                placeholder="What's on your mind?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[140px] resize-none border-0 bg-transparent focus-visible:ring-0 text-base px-4 py-3 placeholder:text-muted-foreground/60"
              />

              {/* Media previews */}
              {files.length > 0 && (
                <div
                  className={cn(
                    "px-3 pb-3 grid gap-1.5",
                    files.length === 1 ? "grid-cols-1" : "grid-cols-2",
                  )}
                >
                  {files.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="relative rounded-xl overflow-hidden bg-muted"
                      style={{ aspectRatio: files.length === 1 ? "4/3" : "1/1" }}
                    >
                      {file.type.startsWith("video") ? (
                        <video
                          className="w-full h-full object-cover"
                          src={filePreviews[i]}
                          muted
                        />
                      ) : (
                        <img
                          className="w-full h-full object-cover"
                          src={filePreviews[i]}
                          alt=""
                        />
                      )}
                      <button
                        type="button"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                        onClick={() => handleRemoveFile(i)}
                        aria-label="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add more tile */}
                  <button
                    type="button"
                    className="rounded-xl border-2 border-dashed border-border hover:border-primary hover:text-primary flex flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors"
                    style={{ aspectRatio: files.length === 1 ? undefined : "1/1", minHeight: 72 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[11px]">Add more</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom action bar */}
            <div className="border-t px-3 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-0.5">
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
                  className="h-9 w-9 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                  title="Add photo / video"
                >
                  <Image className="h-5 w-5 text-green-600" />
                </Button>
                <EmojiPicker
                  onSelect={(emoji) => {
                    setContent((prev) => prev + emoji);
                    setEmojiCodes((prev) => [...prev, emoji]);
                  }}
                />
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  placeholder="Location"
                />
              </div>

              <span
                className={cn(
                  "text-xs tabular-nums",
                  content.length > 450 ? "text-destructive font-semibold" : "text-muted-foreground",
                )}
              >
                {content.length}/500
              </span>
            </div>
          </>
        )}

        {/* ── Step 2: Tags + Details ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="overflow-y-auto" style={{ maxHeight: "65vh" }}>
            {/* Mini post preview */}
            <div className="px-4 py-3 border-b bg-muted/30 space-y-1.5">
              <p className="text-sm text-foreground/80 line-clamp-3 leading-snug">{content}</p>
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Image className="h-3.5 w-3.5" />
                  {files.length} {files.length === 1 ? "photo/video" : "photos/videos"} attached
                </p>
              )}
            </div>

            <div className="px-4 py-4 space-y-5">
              {/* Tags */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Tags
                </label>
                <TagPicker value={tags} onChange={setTags} placeholder="Add tags…" />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="rounded-full pl-2.5 pr-1.5 gap-1 text-xs"
                      >
                        #{tag}
                        <button
                          type="button"
                          className="hover:text-destructive transition-colors"
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

              {/* Location */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </label>
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  placeholder="Add a location…"
                />
              </div>

              {/* Emoji */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Smile className="h-4 w-4 text-muted-foreground" />
                  Emoji reactions
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <EmojiPicker
                    onSelect={(emoji) => setEmojiCodes((prev) => [...prev, emoji])}
                  />
                  {emojiCodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-xl">
                      {emojiCodes.map((code, i) => (
                        <button
                          key={`${code}-${i}`}
                          type="button"
                          className="hover:opacity-60 transition-opacity"
                          onClick={() =>
                            setEmojiCodes((prev) => prev.filter((_, j) => j !== i))
                          }
                          title="Remove"
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Post button pinned at bottom */}
            <div className="px-4 pb-5">
              <Button
                className="w-full h-11 rounded-xl text-sm font-semibold"
                disabled={!content.trim() || isSubmitting}
                onClick={handlePost}
              >
                {isSubmitting ? "Posting…" : "Share Post"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
