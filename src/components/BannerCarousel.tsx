import { useQuery } from "@tanstack/react-query";
import { bannersApi, type CmsMobileBannerDto } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function BannerCarousel() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["banners", "active"],
    queryFn: bannersApi.listActive,
  });

  useEffect(() => {
    if (banners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  const handleBannerClick = (banner: CmsMobileBannerDto) => {
    if (banner.redirectType === "INTERNAL") {
      navigate(banner.redirectTarget);
    } else {
      window.open(banner.redirectTarget, "_blank");
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (isLoading) {
    return (
      <div className="w-full h-48 bg-slate-200 rounded-lg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full overflow-hidden rounded-lg mb-6">
      {/* Banner Image */}
      <div className="relative h-48 sm:h-64 bg-slate-100">
        <img
          src={currentBanner.imageUrl}
          alt={currentBanner.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://via.placeholder.com/600x300?text=" +
              encodeURIComponent(currentBanner.title);
          }}
        />

        {/* Clickable Overlay */}
        <button
          onClick={() => handleBannerClick(currentBanner)}
          className="absolute inset-0 hover:bg-black/10 transition-colors"
          aria-label={`Navigate to ${currentBanner.title}`}
        />

        {/* Banner Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <h3 className="text-white font-semibold text-sm sm:text-base">
            {currentBanner.title}
          </h3>
        </div>

        {/* Navigation Buttons */}
        {banners.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 p-2 rounded-full transition-colors"
              aria-label="Previous banner"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-900 p-2 rounded-full transition-colors"
              aria-label="Next banner"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Indicator Dots */}
      {banners.length > 1 && (
        <div className="flex justify-center gap-2 p-3 bg-slate-50">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                index === currentIndex ? "bg-slate-900" : "bg-slate-300"
              )}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
