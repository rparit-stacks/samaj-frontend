import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { jobApi, type JobSummaryDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  ChevronRight,
  Clock,
  Plus,
  Building2,
  MapPin,
} from "lucide-react";
import { jobDeadlineLabel, jobSalaryLabel, jobTypeBadgeClass, jobTypeLabel } from "@/lib/jobConstants";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";

function statusBadge(status: JobSummaryDto["status"]) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-100 text-emerald-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function Row({ job }: { job: JobSummaryDto }) {
  const dl = jobDeadlineLabel(job.deadline);
  const salary = jobSalaryLabel(job.salaryMin, job.salaryMax);

  return (
    <Link
      to={`/jobs/my/${job.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(job.status)}`}>
            {job.status}
          </span>
          <h3 className="font-semibold text-base mt-1.5 leading-snug line-clamp-2">{job.title}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
            {job.company}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {job.location && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" /> {job.location}
          </span>
        )}
        {job.jobType && (
          <span className={`font-medium px-2 py-0.5 rounded-full ${jobTypeBadgeClass(job.jobType)}`}>
            {jobTypeLabel(job.jobType)}
          </span>
        )}
        {salary && <span className="text-emerald-800 font-medium">{salary}</span>}
        {dl && (
          <span className={`flex items-center gap-1 ${dl.urgent ? "text-red-600" : "text-muted-foreground"}`}>
            <Clock className="h-3 w-3" /> {dl.text}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function JobsMy() {
  const { data, isLoading } = useQuery({
    queryKey: ["jobs", "my", "list"],
    queryFn: () => jobApi.listMine({ page: 0, size: 50 }),
  });

  const rows = data?.content ?? [];

  return (
    <AppLayout title="My job posts">
      <div className={`${APP_PAGE_CONTAINER} space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">My submissions</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track review status and update drafts</p>
          </div>
          <Button asChild size="sm" className="rounded-xl gap-1.5 flex-shrink-0">
            <Link to="/jobs/submit">
              <Plus className="h-4 w-4" /> New
            </Link>
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2 h-8 w-fit" asChild>
          <Link to="/jobs">← Job board</Link>
        </Button>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center">
            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">No job posts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Share an opening with the community.</p>
            <Button asChild className="mt-4 rounded-xl">
              <Link to="/jobs/submit">Post a job</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((j) => (
              <Row key={j.id} job={j} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
