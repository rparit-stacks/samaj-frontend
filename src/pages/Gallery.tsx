import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, Plus, Loader2, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyGallery, EmptySearch } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { galleryApi, cloudApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Gallery() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["gallery", "albums"],
    queryFn: galleryApi.listAlbums,
  });

  const { data: albumDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["gallery", "album", selectedAlbumId],
    queryFn: () => galleryApi.getAlbum(selectedAlbumId!),
    enabled: !!selectedAlbumId,
  });

  const createAlbumMutation = useMutation({
    mutationFn: galleryApi.createAlbum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery"] });
      toast({ title: "Album created", description: "It will appear after admin approval." });
      setCreateOpen(false);
      resetCreateForm();
    },
    onError: (e) => {
      toast({ title: "Failed to create album", description: e.message, variant: "destructive" });
    },
  });

  const filteredAlbums = albums.filter((album) =>
    album.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const navigatePhoto = (direction: number) => {
    if (!albumDetail?.photoUrls?.length) return;
    const newIndex = currentPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < albumDetail.photoUrls.length) {
      setCurrentPhotoIndex(newIndex);
    }
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "photo";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const handleShare = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Photo",
          url,
          text: "Check out this photo from Samaj Gallery",
        });
        toast({ title: "Shared successfully" });
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          window.open(url, "_blank");
        }
      }
    } else {
      window.open(url, "_blank");
    }
  };

  // —— Create Album: 3 steps ——
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [createName, setCreateName] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ phase: "idle" | "cover" | "photos"; current?: number; total?: number }>({ phase: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // After step 2 upload: URLs for step 3 review (remove = remove from list)
  const [uploadedCoverUrl, setUploadedCoverUrl] = useState<string | null>(null);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);

  const resetCreateForm = useCallback(() => {
    setCreateStep(1);
    setCreateName("");
    setCoverFile(null);
    setCoverPreview(null);
    setPhotoFiles([]);
    setUploadedCoverUrl(null);
    setUploadedPhotoUrls([]);
    setUploadProgress({ phase: "idle" });
    setIsSubmitting(false);
  }, []);

  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setCoverFile(f);
      setCoverPreview(URL.createObjectURL(f));
    }
  };

  const onPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles((prev) => [...prev, ...files]);
  };

  const removePhotoFile = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /** Step 2: Upload cover + photos to cloud, then go to step 3 */
  const runUpload = async () => {
    if (!coverFile || photoFiles.length === 0) {
      toast({ title: "Add cover photo and at least one photo", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      setUploadProgress({ phase: "cover" });
      const coverRes = await cloudApi.uploadGalleryImage(coverFile);
      setUploadedCoverUrl(coverRes.url);

      setUploadProgress({ phase: "photos", current: 0, total: photoFiles.length });
      const urls: string[] = [];
      for (let i = 0; i < photoFiles.length; i++) {
        setUploadProgress({ phase: "photos", current: i + 1, total: photoFiles.length });
        const res = await cloudApi.uploadGalleryImage(photoFiles[i]);
        urls.push(res.url);
      }
      setUploadedPhotoUrls(urls);
      setUploadProgress({ phase: "idle" });
      setCreateStep(3);
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Please try again",
        variant: "destructive",
      });
      setUploadProgress({ phase: "idle" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Step 3: Remove image from list and delete from cloud */
  const removeUploadedImage = async (index: number) => {
    const url = reviewUrls[index];
    try {
      await cloudApi.deleteByUrl(url);
    } catch {
      toast({ title: "Removed from album", description: "Could not delete from cloud.", variant: "destructive" });
    }
    if (index === 0) {
      if (uploadedPhotoUrls.length === 0) return;
      setUploadedCoverUrl(uploadedPhotoUrls[0]);
      setUploadedPhotoUrls((prev) => prev.slice(1));
    } else {
      setUploadedPhotoUrls((prev) => prev.filter((_, i) => i !== index - 1));
    }
  };

  const reviewUrls = uploadedCoverUrl ? [uploadedCoverUrl, ...uploadedPhotoUrls] : [];

  /** Step 3: Submit create album */
  const submitCreateAlbum = async () => {
    if (!uploadedCoverUrl || uploadedPhotoUrls.length === 0) {
      toast({ title: "Keep at least one photo", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await createAlbumMutation.mutateAsync({
        name: createName.trim(),
        coverPhotoUrl: uploadedCoverUrl,
        photoUrls: uploadedPhotoUrls,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPhotoUrl = albumDetail?.photoUrls?.[currentPhotoIndex];

  return (
    <AppLayout title="Gallery">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Photo Gallery</h1>
            <p className="text-muted-foreground">Albums from the community</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link to="/gallery/me">
                <FolderOpen className="h-4 w-4" />
                My Albums
              </Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Album
            </Button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {selectedAlbumId ? (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => { setSelectedAlbumId(null); setLightboxOpen(false); }}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Albums
            </Button>

            {detailLoading || !albumDetail ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                {!albumDetail.approved && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 px-4 py-3 text-sm mb-4">
                    This album is <strong>pending approval</strong>. It is visible only to you. It will appear in the gallery for everyone after admin approval.
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{albumDetail.name}</h2>
                    <p className="text-muted-foreground">
                      {formatDate(albumDetail.createdAt)} · {albumDetail.photoUrls.length} photos
                      {!albumDetail.approved && " · Pending approval"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                  {albumDetail.photoUrls.map((photo, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative"
                      onClick={() => openLightbox(index)}
                    >
                      <OptimizedImage
                        src={photo}
                        alt={`${albumDetail.name} - Photo ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        showSkeleton={true}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="bg-card rounded-2xl">
            {searchQuery ? (
              <EmptySearch onClear={() => setSearchQuery("")} />
            ) : (
              <EmptyGallery />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAlbums.map((album) => (
              <div
                key={album.id}
                className="group cursor-pointer"
                onClick={() => setSelectedAlbumId(album.id)}
              >
                <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-3 relative">
                  <OptimizedImage
                    src={album.coverPhotoUrl ?? ""}
                    alt={album.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    showSkeleton={true}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 items-end">
                    <Badge variant="secondary" className="text-xs">
                      {album.photoCount} photos
                    </Badge>
                    {album.approved ? (
                      <Badge className="text-xs bg-green-600 hover:bg-green-600">Approved</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 bg-amber-500/10">
                        Pending approval
                      </Badge>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-1">
                  {album.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(album.createdAt)}
                  {!album.approved && " · Visible only to you"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-0">
          {albumDetail && currentPhotoUrl && (
            <div className="relative">
              <OptimizedImage
                src={currentPhotoUrl}
                alt={`${albumDetail.name} - Photo ${currentPhotoIndex + 1}`}
                className="w-full h-auto max-h-[80vh] object-contain"
                showSkeleton={false}
              />
              <div className="absolute inset-y-0 left-0 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 text-white hover:bg-white/20"
                  onClick={() => navigatePhoto(-1)}
                  disabled={currentPhotoIndex === 0}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 text-white hover:bg-white/20"
                  onClick={() => navigatePhoto(1)}
                  disabled={currentPhotoIndex === albumDetail.photoUrls.length - 1}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                <span className="text-white text-sm">
                  {currentPhotoIndex + 1} / {albumDetail.photoUrls.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => handleDownload(currentPhotoUrl, `${albumDetail.name}-${currentPhotoIndex + 1}`)}
                >
                  <Download className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => handleShare(currentPhotoUrl, albumDetail.name)}
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Album – 3 steps, mobile-first */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!isSubmitting) setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <div className="space-y-4">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg sm:text-xl">Create Album</DialogTitle>
              {/* Step indicator */}
              <div className="flex items-center gap-1 sm:gap-2">
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0", createStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>1</div>
                <div className={cn("h-0.5 flex-1 min-w-2", createStep >= 2 ? "bg-primary" : "bg-muted")} />
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0", createStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</div>
                <div className={cn("h-0.5 flex-1 min-w-2", createStep >= 3 ? "bg-primary" : "bg-muted")} />
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium shrink-0", createStep >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>3</div>
              </div>
            </DialogHeader>

            {/* Step 1: Name only */}
            {createStep === 1 && (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <Label htmlFor="album-name" className="text-sm font-medium">Album name</Label>
                <Input
                  id="album-name"
                  placeholder="e.g. Diwali 2025"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="h-12 text-base"
                  autoFocus
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 h-12" onClick={() => setCreateStep(2)} disabled={!createName.trim()}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Upload cover + photos */}
          {createStep === 2 && (
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cover photo</Label>
                <div className="flex gap-3 items-start">
                  <label className="flex-1 min-w-0 cursor-pointer">
                    <input type="file" accept="image/*" className="sr-only" onChange={onCoverChange} disabled={isSubmitting} />
                    <div className="h-24 sm:h-28 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground text-sm hover:border-primary/50 transition-colors">
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover" className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        "Tap to add cover"
                      )}
                    </div>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Photos</Label>
                <label className="block cursor-pointer">
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={onPhotosChange} disabled={isSubmitting} />
                  <div className="h-12 rounded-xl border-2 border-dashed flex items-center justify-center text-muted-foreground text-sm hover:border-primary/50 transition-colors">
                    + Add photos
                  </div>
                </label>
                {photoFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {photoFiles.map((f, i) => (
                      <div key={i} className="relative group">
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-xs truncate px-1">
                          {f.name}
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full opacity-90 group-hover:opacity-100"
                          onClick={() => removePhotoFile(i)}
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {uploadProgress.phase !== "idle" && (
                <div className="rounded-xl bg-muted p-4 space-y-3">
                  {uploadProgress.phase === "cover" && (
                    <p className="text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      Uploading cover...
                    </p>
                  )}
                  {uploadProgress.phase === "photos" && uploadProgress.total != null && (
                    <>
                      <p className="text-sm flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        Uploading photos {uploadProgress.current ?? 0} / {uploadProgress.total}
                      </p>
                      <div className="h-2 bg-background rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${((uploadProgress.current ?? 0) / uploadProgress.total) * 100}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setCreateStep(1)} disabled={isSubmitting}>
                  Back
                </Button>
                <Button className="flex-1 h-12" onClick={runUpload} disabled={isSubmitting || !coverFile || photoFiles.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    "Upload & continue"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: View all images, remove, then Create */}
          {createStep === 3 && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Review and remove any photo. Then create album.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {reviewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {index === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] py-0.5 text-center">Cover</span>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7 rounded-full opacity-90 hover:opacity-100 shadow"
                      onClick={() => removeUploadedImage(index)}
                      disabled={isSubmitting || reviewUrls.length <= 1}
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setCreateStep(2)} disabled={isSubmitting}>
                  Back
                </Button>
                <Button className="flex-1 h-12" onClick={submitCreateAlbum} disabled={isSubmitting || reviewUrls.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Album"
                  )}
                </Button>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
