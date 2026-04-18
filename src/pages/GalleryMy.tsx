import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Skeleton } from "@/components/ui/skeleton";
import { galleryApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function GalleryMy() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["gallery", "my"],
    queryFn: galleryApi.listMyAlbums,
  });

  const { data: albumDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["gallery", "album", selectedAlbumId],
    queryFn: () => galleryApi.getAlbum(selectedAlbumId!),
    enabled: !!selectedAlbumId,
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

  const currentPhotoUrl = albumDetail?.photoUrls?.[currentPhotoIndex];

  return (
    <AppLayout title="My Albums">
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <Button variant="ghost" className="w-fit gap-2" asChild>
            <Link to="/gallery">
              <ChevronLeft className="h-4 w-4" />
              Back to Gallery
            </Link>
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">My Albums</h1>
          <p className="text-muted-foreground">Your albums — approved and pending approval</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search your albums..."
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
                    This album is <strong>pending approval</strong>. It is visible only to you.
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
          <div className="bg-card rounded-2xl py-12 text-center">
            <p className="text-muted-foreground">No albums yet</p>
            <Button variant="link" asChild className="mt-2">
              <Link to="/gallery">Create an album</Link>
            </Button>
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
    </AppLayout>
  );
}
