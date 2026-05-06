import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { jobApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  JobListingFormFields,
  emptyJobFormState,
  jobFormStateToPayload,
  type JobListingFormState,
} from "@/components/jobs/JobListingFormFields";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Loader2 } from "lucide-react";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";

export default function JobSubmit() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<JobListingFormState>(emptyJobFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof JobListingFormState, string>>>({});

  const patch = (p: Partial<JobListingFormState>) => setForm((f) => ({ ...f, ...p }));

  const mutation = useMutation({
    mutationFn: () => jobApi.submit(jobFormStateToPayload(form)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({
        title: "Submitted for review",
        description: "An admin will review your listing before it appears on the job board.",
      });
      navigate(`/jobs/my/${res.id}`);
    },
    onError: (e: Error) => {
      toast({ title: "Could not submit", description: e.message, variant: "destructive" });
    },
  });

  function validate(): boolean {
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
    if (!validate()) return;
    mutation.mutate();
  }

  return (
    <AppLayout title="Post a job">
      <div className={`${APP_PAGE_CONTAINER} space-y-5`}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Post a job</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Listings are reviewed by admins before they appear publicly. You can track status under{" "}
              <Link to="/jobs/my" className="text-primary font-medium underline-offset-2 hover:underline">
                My submissions
              </Link>
              .
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-2xl border border-border/60 bg-card p-4 md:p-6 space-y-6">
          <JobListingFormFields form={form} onChange={patch} errors={errors} />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2 border-t border-border/50">
            <Button type="button" variant="outline" className="rounded-xl" asChild>
              <Link to="/jobs">Cancel</Link>
            </Button>
            <Button type="submit" className="rounded-xl gap-2" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit for review
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
