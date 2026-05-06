import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { jobApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Eye,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Star,
} from "lucide-react";
import {
  jobDeadlineLabel,
  jobSalaryLabel,
  jobTypeBadgeClass,
  jobTypeLabel,
} from "@/lib/jobConstants";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading, isError, error } = useQuery({
    queryKey: ["jobs", "detail", id],
    queryFn: () => jobApi.get(id!),
    enabled: !!id,
  });

  const dl = job ? jobDeadlineLabel(job.deadline) : null;
  const salary = job ? jobSalaryLabel(job.salaryMin, job.salaryMax) : null;

  return (
    <AppLayout title={job?.title ?? "Job"}>
      <div className={`${APP_PAGE_CONTAINER} flex flex-col gap-4`}>
        <Button variant="ghost" size="sm" className="gap-1 -ml-2 mb-1 text-muted-foreground w-fit" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        {isLoading && (
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="font-medium text-destructive">Could not load this job</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "It may have been filled or removed."}
            </p>
            <Button asChild className="mt-4 rounded-xl">
              <Link to="/jobs">Browse jobs</Link>
            </Button>
          </div>
        )}

        {job && (
          <article className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="p-5 md:p-7 space-y-5">
              <div className="flex flex-wrap items-start gap-2">
                {job.featured && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    <Star className="h-3 w-3" fill="currentColor" /> Featured
                  </span>
                )}
                {job.jobType && (
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${jobTypeBadgeClass(job.jobType)}`}>
                    {jobTypeLabel(job.jobType)}
                  </span>
                )}
                {job.category && (
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {job.category}
                  </span>
                )}
              </div>

              <header className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">{job.title}</h1>
                <p className="flex items-center gap-2 text-lg text-foreground/85 font-medium">
                  <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  {job.company}
                </p>
              </header>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {job.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {job.location}
                  </span>
                )}
                {salary && (
                  <span className="flex items-center gap-1.5 font-medium text-emerald-800">
                    <IndianRupee className="h-4 w-4 flex-shrink-0" />
                    {salary}
                  </span>
                )}
                {dl && (
                  <span className={`flex items-center gap-1.5 ${dl.urgent ? "text-red-600 font-medium" : ""}`}>
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    {dl.text}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 flex-shrink-0" />
                  {job.viewCount} views
                </span>
              </div>

              <div className="h-px bg-border/60" />

              <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About the role</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {job.description}
                </div>
              </section>

              {job.requirements?.trim() && (
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Requirements</h2>
                  <div className="whitespace-pre-wrap text-sm text-foreground/85 leading-relaxed">{job.requirements}</div>
                </section>
              )}

              {(job.applyUrl || job.contactEmail || job.contactPhone) && (
                <section className="rounded-xl bg-muted/40 p-4 space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">Apply</h2>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    {job.applyUrl && (
                      <Button asChild className="rounded-xl gap-2">
                        <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                          Apply online <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {job.contactEmail && (
                      <Button variant="outline" asChild className="rounded-xl gap-2">
                        <a href={`mailto:${job.contactEmail}`}>
                          <Mail className="h-4 w-4" /> Email
                        </a>
                      </Button>
                    )}
                    {job.contactPhone && (
                      <Button variant="outline" asChild className="rounded-xl gap-2">
                        <a href={`tel:${job.contactPhone.replace(/\s/g, "")}`}>
                          <Phone className="h-4 w-4" /> Call
                        </a>
                      </Button>
                    )}
                  </div>
                </section>
              )}

              <p className="text-xs text-muted-foreground">
                Posted {new Date(job.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </article>
        )}
      </div>
    </AppLayout>
  );
}
