import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { jobApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  JobListingFormFields,
  jobDetailToFormState,
  jobFormStateToPayload,
  type JobListingFormState,
} from "@/components/jobs/JobListingFormFields";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";

export default function JobEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<JobListingFormState | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof JobListingFormState, string>>>({});

  const { data: job, isLoading, isError } = useQuery({
    queryKey: ["jobs", "my", id],
    queryFn: () => jobApi.getMine(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (job) setForm(jobDetailToFormState(job));
  }, [job]);

  const mutation = useMutation({
    mutationFn: () => jobApi.update(id!, jobFormStateToPayload(form!)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({
        title: "Updated",
        description: "Your listing is pending review again after edits.",
      });
      navigate(`/jobs/my/${id}`);
    },
    onError: (e: Error) => {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    },
  });

  function validate(): boolean {
    if (!form) return false;
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.company.trim()) e.company = "Company is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (form.applyUrl.trim() && !/^https?:\/\/.+/i.test(form.applyUrl.trim())) {
      e.applyUrl = "Link must start with http:// or https://";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form || !validate()) return;
    mutation.mutate();
  }

  const blocked = job?.status === "APPROVED";

  return (
    <AppLayout title="Edit job">
      <div className={`${APP_PAGE_CONTAINER} space-y-5`}>
        {isLoading && (
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive text-center py-8">Could not load your listing.</p>
        )}

        {blocked && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">Approved listings cannot be edited here</p>
              <p className="text-sm text-amber-800/90 dark:text-amber-200/80 mt-1">
                Contact a community admin if you need changes to a live job post.
              </p>
              <Button asChild variant="outline" className="mt-3 rounded-xl" size="sm">
                <Link to={`/jobs/${id}`}>View public listing</Link>
              </Button>
            </div>
          </div>
        )}

        {form && job && !blocked && (
          <form onSubmit={onSubmit} className="rounded-2xl border border-border/60 bg-card p-4 md:p-6 space-y-6">
            <div>
              <h1 className="text-xl font-bold">Edit job</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Status: <span className="font-medium text-foreground">{job.status}</span>
                {job.status === "REJECTED" && job.rejectionReason && (
                  <span className="block mt-2 text-destructive/90">
                    Previous feedback: {job.rejectionReason}
                  </span>
                )}
              </p>
            </div>
            <JobListingFormFields form={form} onChange={(p) => setForm((f) => (f ? { ...f, ...p } : f))} errors={errors} />
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t border-border/50">
              <Button type="button" variant="outline" className="rounded-xl" asChild>
                <Link to={`/jobs/my/${id}`}>Cancel</Link>
              </Button>
              <Button type="submit" className="rounded-xl gap-2" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save & resubmit
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
