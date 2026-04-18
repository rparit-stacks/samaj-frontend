import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Image, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  communityApi,
  cloudApi,
  userApi,
  type CommunityPost,
  type UserProfile,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { LocationPicker } from "@/components/ui/location-picker";
import { TagPicker } from "@/components/ui/tag-picker";
import { ImageUrlWithUpload } from "@/components/ImageUrlWithUpload";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (post: CommunityPost) => void;
}

export function CreatePostDialog({ open, onOpenChange, onCreated }: CreatePostDialogProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [attachedImageUrls, setAttachedImageUrls] = useState<string[]>([]);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [emojiCodes, setEmojiCodes] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
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
    user?.phone ||
    "You";

  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const avatarUrl = profile?.avatarUrl ?? undefined;
  const city = profile?.city || "";
  const subtitle = city
    ? `${city} • Share with your community`
    : "Share with your community";

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    setFiles((prev) => [...prev, ...selected]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-sm">{name}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none border-0 bg-muted/30 focus-visible:ring-0 text-base"
          />

          {files.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="relative aspect-video rounded-xl overflow-hidden bg-muted"
                >
                  {file.type.startsWith("video") ? (
                    <video
                      className="w-full h-full object-cover"
                      src={URL.createObjectURL(file)}
                      muted
                    />
                  ) : (
                    <img
                      className="w-full h-full object-cover"
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                    />
                  )}
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
            <ImageUrlWithUpload
              id="post-image-url-draft"
              label="Add image from URL"
              optional
              value={imageUrlDraft}
              onChange={setImageUrlDraft}
              folder="community"
              auth="user"
              helperText="Paste a link or upload, then tap Add to attach (images only)."
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={!imageUrlDraft.trim()}
              onClick={() => {
                const u = imageUrlDraft.trim();
                if (!u) return;
                setAttachedImageUrls((prev) => [...prev, u]);
                setImageUrlDraft("");
              }}
            >
              Add URL to post
            </Button>
            {attachedImageUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {attachedImageUrls.map((u, index) => (
                  <div key={`${u}-${index}`} className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <img className="w-full h-full object-cover" src={u} alt="" />
                    <Button
                      size="icon-sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      type="button"
                      onClick={() => setAttachedImageUrls((prev) => prev.filter((_, j) => j !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2">
              <LocationPicker
                value={location}
                onChange={setLocation}
                placeholder="Add location"
              />
              <EmojiPicker
                onSelect={(emoji) => {
                  setContent((prev) => prev + emoji);
                  setEmojiCodes((prev) => [...prev, emoji]);
                }}
              />
              <TagPicker value={tags} onChange={setTags} placeholder="Add tags" />
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
                size="icon-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image className="h-5 w-5 text-green-600" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!content.trim() || isSubmitting) return;
              setIsSubmitting(true);
              try {
                const media: { url: string; type: "IMAGE" | "VIDEO"; sortOrder: number }[] =
                  [];

                for (let i = 0; i < files.length; i++) {
                  const file = files[i];
                  const uploaded = await cloudApi.uploadToFolder("community", file);
                  media.push({
                    url: uploaded.url,
                    type: file.type.startsWith("video") ? "VIDEO" : "IMAGE",
                    sortOrder: media.length,
                  });
                }
                for (let i = 0; i < attachedImageUrls.length; i++) {
                  media.push({
                    url: attachedImageUrls[i],
                    type: "IMAGE",
                    sortOrder: media.length,
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

                toast({
                  title: "Post created",
                  description: "Your post has been shared with the community.",
                });
                setContent("");
                setFiles([]);
                setAttachedImageUrls([]);
                setImageUrlDraft("");
                setEmojiCodes([]);
                setLocation("");
                setTags([]);
                onCreated?.(created);
                onOpenChange(false);
              } catch (err: any) {
                toast({
                  title: "Could not create post",
                  description: err?.message ?? "Please try again.",
                  variant: "destructive",
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
