import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { jobApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  jobDeadlineLabel,
  jobSalaryLabel,
  jobTypeBadgeClass,
  jobTypeLabel,
} from "@/lib/jobConstants";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";

export default function JobsMyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ["jobs", "my", id],
    queryFn: () => jobApi.getMine(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Listing removed" });
      navigate("/jobs/my");
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const dl = job ? jobDeadlineLabel(job.deadline) : null;
  const salary = job ? jobSalaryLabel(job.salaryMin, job.salaryMax) : null;
  const canEdit = job && job.status !== "APPROVED";

  return (
    <AppLayout title="My job">
      <div className={`${APP_PAGE_CONTAINER} space-y-4`}>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground w-fit" asChild>
          <Link to="/jobs/my">
            <ArrowLeft className="h-4 w-4" /> All my posts
          </Link>
        </Button>

        {isLoading && <Skeleton className="h-64 rounded-2xl" />}
        {isError && <p className="text-destructive text-center py-8">Could not load this listing.</p>}

        {job && (
          <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-full ${
                  job.status === "APPROVED"
                    ? "bg-emerald-100 text-emerald-800"
                    : job.status === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {job.status}
              </span>
              {job.postedByAdmin && (
                <span className="text-[11px] text-muted-foreground">Posted via admin</span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold leading-tight">{job.title}</h1>
              <p className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {job.company}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {job.jobType && (
                <span className={`font-semibold px-2 py-1 rounded-full ${jobTypeBadgeClass(job.jobType)}`}>
                  {jobTypeLabel(job.jobType)}
                </span>
              )}
              {job.category && (
                <span className="font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">{job.category}</span>
              )}
              {salary && <span className="text-emerald-800 font-medium">{salary}</span>}
              {dl && <span className={dl.urgent ? "text-red-600 font-medium" : "text-muted-foreground"}>{dl.text}</span>}
            </div>

            {job.status === "REJECTED" && job.rejectionReason && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm">
                <p className="font-medium text-destructive">Feedback</p>
                <p className="mt-1 text-destructive/90">{job.rejectionReason}</p>
              </div>
            )}

            {job.status === "PENDING" && (
              <p className="text-sm text-muted-foreground">
                Your listing is in the review queue. You will be notified when it is approved or needs changes.
              </p>
            )}

            <div className="h-px bg-border/60" />
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">Description</h2>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>

            {job.requirements?.trim() && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">Requirements</h2>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
              {job.status === "APPROVED" && (
                <Button asChild className="rounded-xl gap-2">
                  <Link to={`/jobs/${job.id}`}>
                    View on job board <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" asChild className="rounded-xl gap-2">
                  <Link to={`/jobs/my/${job.id}/edit`}>
                    <Pencil className="h-4 w-4" /> Edit & resubmit
                  </Link>
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl gap-2 text-destructive border-destructive/30 sm:ml-auto">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate()}
                    >
                      {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
