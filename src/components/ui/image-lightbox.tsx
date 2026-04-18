import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

export interface LightboxMedia {
  id?: number;
  url: string;
  type: "IMAGE" | "VIDEO";
}

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: LightboxMedia[];
  initialIndex?: number;
}

export function ImageLightbox({
  open,
  onOpenChange,
  media,
  initialIndex = 0,
}: ImageLightboxProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    skipSnaps: false,
  });
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const imagesOnly = media.filter((m) => m.type === "IMAGE");

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (open && emblaApi && initialIndex >= 0 && initialIndex < imagesOnly.length) {
      emblaApi.scrollTo(initialIndex, true);
    }
  }, [open, emblaApi, initialIndex, imagesOnly.length]);

  if (imagesOnly.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[100vw] w-full h-[100dvh] p-0 gap-0 border-0 bg-black/95 [&>button:last-of-type]:hidden"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            ref={emblaRef}
            className="overflow-hidden w-full h-full flex items-center justify-center touch-pan-y"
          >
            <div className="flex h-full w-full">
              {imagesOnly.map((m, idx) => (
                <div
                  key={m.id ?? idx}
                  className="flex-[0_0_100%] min-w-0 flex items-center justify-center"
                >
                  <img
                    src={m.url}
                    alt=""
                    className="max-w-full max-h-[100dvh] w-auto h-auto object-contain select-none"
                    draggable={false}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {imagesOnly.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
                onClick={scrollPrev}
                disabled={!canScrollPrev && !emblaApi?.canScrollPrev()}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
                onClick={scrollNext}
                disabled={!canScrollNext && !emblaApi?.canScrollNext()}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {imagesOnly.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {imagesOnly.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    idx === selectedIndex ? "bg-white" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
