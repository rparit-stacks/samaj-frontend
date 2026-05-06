import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { businessApi, type BusinessSummaryDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase, Plus, Edit2, Trash2, CheckCircle2, Clock, XCircle, Ban,
  ArrowRight, MapPin,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";

type Status = BusinessSummaryDto["status"];

function statusConfig(status: Status) {
  switch (status) {
    case "APPROVED":
      return {
        label: "Live",
        icon: CheckCircle2,
        className: "bg-green-50 border-green-200 text-green-700",
        iconClass: "text-green-600",
        dot: "bg-green-500",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        icon: XCircle,
        className: "bg-red-50 border-red-200 text-red-700",
        iconClass: "text-red-600",
        dot: "bg-red-500",
      };
    case "BANNED":
      return {
        label: "Suspended",
        icon: Ban,
        className: "bg-slate-100 border-slate-200 text-slate-600",
        iconClass: "text-slate-500",
        dot: "bg-slate-400",
      };
    default:
      return {
        label: "Under review",
        icon: Clock,
        className: "bg-amber-50 border-amber-200 text-amber-700",
        iconClass: "text-amber-600",
        dot: "bg-amber-400",
      };
  }
}

function ListingCard({ b, onDelete }: { b: BusinessSummaryDto; onDelete: (id: string) => void }) {
  const cfg = statusConfig(b.status);
  const Icon = cfg.icon;

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Top strip with image + info */}
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex-shrink-0">
          {b.firstPhoto ? (
            <img src={b.firstPhoto} alt={b.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 py-0.5">
          <p className="font-semibold text-sm line-clamp-1">{b.name}</p>
          {b.category && (
            <span className="text-[11px] text-muted-foreground">{b.category}</span>
          )}
          {b.city && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" /> {b.city}
            </p>
          )}
          {/* Status badge */}
          <span className={`inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}>
            <Icon className={`h-3 w-3 ${cfg.iconClass}`} />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Action row */}
      <div className="border-t border-border/40 flex divide-x divide-border/40">
        {b.status === "APPROVED" && (
          <Link
            to={`/business/${b.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            View <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
        {b.status !== "BANNED" && (
          <Link
            to={`/business/${b.id}/edit`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </Link>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{b.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove this listing. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => onDelete(b.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function StatusSummary({ listings }: { listings: BusinessSummaryDto[] }) {
  const counts = listings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {} as Record<Status, number>);

  if (listings.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {(["APPROVED", "PENDING", "REJECTED", "BANNED"] as Status[])
        .filter((s) => counts[s])
        .map((s) => {
          const cfg = statusConfig(s);
          const Icon = cfg.icon;
          return (
            <div key={s} className={`rounded-xl border px-3 py-2.5 flex items-center gap-2 ${cfg.className}`}>
              <Icon className={`h-4 w-4 ${cfg.iconClass}`} />
              <div>
                <p className="text-base font-bold leading-none">{counts[s]}</p>
                <p className="text-[11px] opacity-80 mt-0.5">{cfg.label}</p>
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default function BusinessMy() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["business", "my"],
    queryFn: () => businessApi.listMine({ size: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => businessApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      toast({ title: "Listing deleted" });
    },
  });

  const listings = data?.content ?? [];

  return (
    <AppLayout title="My businesses">
      <div className={`${APP_PAGE_CONTAINER} flex flex-col gap-4`}>

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold">My Listings</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {listings.length > 0 ? `${listings.length} listing${listings.length !== 1 ? "s" : ""}` : "Manage your businesses"}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="gap-1.5 rounded-xl h-9 px-3">
            <Link to="/business/create">
              <Plus className="h-4 w-4" /> New
            </Link>
          </Button>
        </div>

        {/* How listings work info */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-muted/50 px-3.5 py-3 text-xs text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <p>New and edited listings are reviewed by admins before appearing publicly in the directory.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <div className="flex gap-3 p-3">
                  <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                <div className="border-t border-border/40 h-10" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-semibold">No listings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your business and connect with the community
              </p>
            </div>
            <Button asChild className="gap-1.5 mt-1">
              <Link to="/business/create">
                <Plus className="h-4 w-4" /> Create your first listing
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <StatusSummary listings={listings} />
            <div className="flex flex-col gap-3">
              {listings.map((b) => (
                <ListingCard
                  key={b.id}
                  b={b}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
