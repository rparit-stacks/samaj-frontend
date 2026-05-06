import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { jobApi, type JobSummaryDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, Search, Plus, MapPin, IndianRupee, Clock,
  ChevronRight, ChevronLeft, Star, SlidersHorizontal, X,
  Building2, FileText,
} from "lucide-react";
import {
  JOB_CATEGORIES,
  JOB_TYPES,
  jobDeadlineLabel,
  jobSalaryLabel,
  jobTypeBadgeClass,
  jobTypeLabel,
} from "@/lib/jobConstants";
import { APP_PAGE_CONTAINER } from "@/lib/pageLayout";

function JobCard({ job }: { job: JobSummaryDto }) {
  const salary = jobSalaryLabel(job.salaryMin, job.salaryMax);
  const dl = jobDeadlineLabel(job.deadline);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 hover:bg-muted/30 active:scale-[0.99] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {job.featured && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                <Star className="h-2.5 w-2.5" fill="currentColor" /> HOT
              </span>
            )}
          </div>
          <h3 className="font-bold text-base leading-snug line-clamp-2 mt-0.5">{job.title}</h3>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-1" />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/80">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
          {job.company}
        </span>
        {job.location && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/50" />
            {job.location}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {job.jobType && (
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${jobTypeBadgeClass(job.jobType)}`}>
            {jobTypeLabel(job.jobType)}
          </span>
        )}
        {job.category && (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {job.category}
          </span>
        )}
        {salary && (
          <span className="flex items-center gap-0.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800">
            <IndianRupee className="h-2.5 w-2.5" />
            {salary.replace("₹", "")}
          </span>
        )}
      </div>

      {dl && (
        <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/30">
          <Clock className={`h-3.5 w-3.5 ${dl.urgent ? "text-red-500" : "text-muted-foreground/60"}`} />
          <span className={`text-xs font-medium ${dl.urgent ? "text-red-600" : "text-muted-foreground"}`}>
            {dl.text}
          </span>
        </div>
      )}
    </Link>
  );
}

function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", "list", jobType, category, page],
    queryFn: () => jobApi.list({ category: category || undefined, jobType: jobType || undefined, page, size: 15 }),
  });

  const filtered = (data?.content ?? []).filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      j.title?.toLowerCase().includes(q) ||
      j.company?.toLowerCase().includes(q) ||
      j.location?.toLowerCase().includes(q) ||
      j.category?.toLowerCase().includes(q)
    );
  });

  const totalPages = data?.totalPages ?? 1;
  const activeFilters = (jobType ? 1 : 0) + (category ? 1 : 0);

  return (
    <AppLayout title="Jobs">
      <div className={`${APP_PAGE_CONTAINER} flex flex-col gap-4`}>

        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Job Board</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.totalElements ? `${data.totalElements} open position${data.totalElements !== 1 ? "s" : ""}` : "Community job listings"}
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5 rounded-xl h-9 px-3 flex-shrink-0">
            <Link to="/jobs/submit">
              <Plus className="h-4 w-4" /> Post Job
            </Link>
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies…"
              className="pl-9 h-10 rounded-xl bg-muted/50 border-border/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`relative h-10 w-10 flex items-center justify-center rounded-xl border transition-colors flex-shrink-0 ${
              activeFilters > 0
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 border-border/50 text-muted-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilters > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Type</p>
              <div className="flex flex-wrap gap-1.5">
                {JOB_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => { setJobType(t.value); setPage(0); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      jobType === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border/60 text-muted-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {JOB_CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => { setCategory(c.value); setPage(0); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      category === c.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border/60 text-muted-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7"
                onClick={() => { setJobType(""); setCategory(""); setPage(0); }}
              >
                <X className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            )}
          </div>
        )}

        {!showFilters && activeFilters > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {jobType && (
              <button
                type="button"
                onClick={() => { setJobType(""); setPage(0); }}
                className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full"
              >
                {jobTypeLabel(jobType)} <X className="h-3 w-3" />
              </button>
            )}
            {category && (
              <button
                type="button"
                onClick={() => { setCategory(""); setPage(0); }}
                className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full"
              >
                {category} <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        <Link
          to="/jobs/my"
          className="flex items-center justify-between px-4 py-3 rounded-2xl bg-primary/5 border border-primary/15 group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">My submissions</p>
              <p className="text-xs text-muted-foreground">Track your posted jobs</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        </Link>

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-semibold">No jobs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || activeFilters > 0 ? "Try adjusting your search or filters" : "No job listings right now"}
              </p>
            </div>
            {!search && !activeFilters && (
              <Button asChild size="sm" className="gap-1.5 mt-1">
                <Link to="/jobs/submit"><Plus className="h-4 w-4" /> Post a job</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}

        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Page {page + 1} / {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
