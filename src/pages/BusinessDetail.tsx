import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { businessApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, MapPin, Phone, Mail, Globe, Edit2, Trash2, Star,
  ChevronLeft, ChevronRight, Eye, AlertCircle, ArrowLeft,
  ExternalLink,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";
import { cn } from "@/lib/utils";

function PhotoDots({ total, current }: { total: number; current: number }) {
  if (total <= 1) return null;
  return (
    <div className="flex gap-1 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all ${
            i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
          }`}
        />
      ))}
    </div>
  );
}

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [photoIdx, setPhotoIdx] = useState(0);

  const { data: business, isLoading, error } = useQuery({
    queryKey: ["business", id],
    queryFn: () => businessApi.get(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => businessApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      toast({ title: "Business listing deleted" });
      navigate("/business/my");
    },
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className={APP_PAGE_CONTAINER}>
          <div className="space-y-4">
            <Skeleton className="h-52 w-full rounded-2xl md:h-56" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !business) {
    return (
      <AppLayout>
        <div className={`${APP_PAGE_CONTAINER} flex flex-col items-center justify-center py-24 gap-4 text-center`}>
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <div>
            <p className="font-semibold">Business not found</p>
            <p className="text-sm text-muted-foreground mt-1">This listing may have been removed</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/business"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to directory</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const photos = business.photos ?? [];
  const hasContact = business.phone || business.email || business.website;

  return (
    <AppLayout>
      <div className={cn(APP_PAGE_CONTAINER, hasContact && "pb-36 md:pb-32")}>
      <div className="flex flex-col gap-1">

        {/* Back nav */}
        <div className="flex items-center justify-between py-2">
          <Link
            to="/business"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Directory
          </Link>
          {business.isOwner && (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground">
                <Link to={`/business/${id}/edit`}><Edit2 className="h-3.5 w-3.5" /> Edit</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove "{business.name}" from the directory.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => deleteMutation.mutate()}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Hero photo */}
        <div className="relative rounded-2xl border border-border/50 bg-muted overflow-hidden h-[220px] md:h-56 shadow-sm">
          {photos.length > 0 ? (
            <>
              <img
                src={photos[photoIdx]}
                alt={business.name}
                className="w-full h-full object-cover"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 transition-opacity"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {/* Dots indicator */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <PhotoDots total={photos.length} current={photoIdx} />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Briefcase className="h-14 w-14 text-muted-foreground/20" />
            </div>
          )}

          {/* Featured badge */}
          {business.featured && (
            <div className="absolute top-3 left-3">
              <span className="bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium shadow-sm">
                <Star className="h-3 w-3" fill="currentColor" /> Featured
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 pt-4">
          {/* Status banner (non-approved owners) */}
          {business.status !== "APPROVED" && (
            <div className={`flex items-start gap-3 p-3.5 rounded-2xl text-sm border ${
              business.status === "PENDING"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : business.status === "REJECTED"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-slate-100 border-slate-200 text-slate-700"
            }`}>
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold capitalize">
                  {business.status === "PENDING" ? "Under review" :
                   business.status === "REJECTED" ? "Not approved" : "Suspended"}
                </p>
                {business.status === "PENDING" && (
                  <p className="text-xs mt-0.5">Your listing is being reviewed and will go live once approved.</p>
                )}
                {business.rejectionReason && (
                  <p className="text-xs mt-0.5">{business.rejectionReason}</p>
                )}
              </div>
            </div>
          )}

          {/* Name + meta */}
          <div className="space-y-2">
            <h1 className="text-xl font-bold leading-tight">{business.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {business.category && (
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  {business.category}
                </span>
              )}
              {business.city && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {business.city}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" /> {business.viewCount} views
              </span>
            </div>
          </div>

          {/* Description */}
          {business.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {business.description}
            </p>
          )}

          {/* Contact section */}
          {hasContact && (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-green-700">{business.phone}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-4 w-4 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate text-blue-700">{business.email}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
                </a>
              )}
              {business.website && (
                <a
                  href={business.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 active:bg-muted/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Globe className="h-4 w-4 text-purple-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="text-sm font-medium text-purple-700 truncate">
                      {business.website.replace(/^https?:\/\//, "")}
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40" />
                </a>
              )}
            </div>
          )}

          {/* Address */}
          {(business.address || business.city) && (
            <div className="rounded-2xl border border-border/60 bg-card px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-orange-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm mt-0.5 leading-relaxed">
                    {[business.address, business.city].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Owner card */}
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5">
            <div className="h-10 w-10 rounded-full bg-primary/10 overflow-hidden flex-shrink-0">
              {business.ownerAvatar ? (
                <img src={business.ownerAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-primary text-sm font-semibold">
                  {(business.ownerName || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{business.ownerName}</p>
              <p className="text-xs text-muted-foreground">Business owner</p>
            </div>
            {business.ownerProfileKey && (
              <Button asChild variant="outline" size="sm" className="h-8 text-xs rounded-xl flex-shrink-0">
                <Link to={`/profile/${business.ownerProfileKey}`}>Profile</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Sticky action bar — shown only if contact info exists */}
      {hasContact && (
        <div className="fixed bottom-16 left-0 right-0 z-20 px-4 pb-2 pointer-events-none">
          <div className="max-w-3xl mx-auto w-full flex gap-2 pointer-events-auto md:max-w-4xl">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-2xl h-12 text-sm font-semibold shadow-lg transition-colors"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
            )}
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-card border border-border rounded-2xl h-12 text-sm font-semibold shadow-sm hover:bg-muted/50 transition-colors"
              >
                <Globe className="h-4 w-4" /> Website
              </a>
            )}
            {!business.phone && business.email && (
              <a
                href={`mailto:${business.email}`}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-12 text-sm font-semibold shadow-lg transition-colors"
              >
                <Mail className="h-4 w-4" /> Email
              </a>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
