import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobDetailDto, JobFormData } from "@/lib/api";
import { isoToLocalDatetimeInput, localDatetimeToIso, JOB_CATEGORIES, JOB_TYPES } from "@/lib/jobConstants";
import { Building2, FileText, IndianRupee, Link2, MapPin } from "lucide-react";

export interface JobListingFormState {
  title: string;
  company: string;
  description: string;
  location: string;
  jobType: string;
  category: string;
  requirements: string;
  salaryMin: string;
  salaryMax: string;
  applyUrl: string;
  contactEmail: string;
  contactPhone: string;
  deadlineLocal: string;
}

export const emptyJobFormState: JobListingFormState = {
  title: "",
  company: "",
  description: "",
  location: "",
  jobType: "",
  category: "",
  requirements: "",
  salaryMin: "",
  salaryMax: "",
  applyUrl: "",
  contactEmail: "",
  contactPhone: "",
  deadlineLocal: "",
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-0.5 border-b border-border/50">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function JobListingFormFields({
  form,
  onChange,
  errors,
}: {
  form: JobListingFormState;
  onChange: (patch: Partial<JobListingFormState>) => void;
  errors?: Partial<Record<keyof JobListingFormState, string>>;
}) {
  const selectableTypes = JOB_TYPES.filter((t) => t.value !== "");

  return (
    <div className="space-y-6">
      <Section icon={FileText} title="Role">
        <div className="space-y-2">
          <Label htmlFor="job-title">Job title *</Label>
          <Input
            id="job-title"
            value={form.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Community centre coordinator"
            maxLength={200}
            className="rounded-xl"
          />
          {errors?.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-company">Company / organisation *</Label>
          <Input
            id="job-company"
            value={form.company}
            onChange={(e) => onChange({ company: e.target.value })}
            placeholder="Who is hiring?"
            maxLength={200}
            className="rounded-xl"
          />
          {errors?.company && <p className="text-xs text-destructive">{errors.company}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-desc">Description *</Label>
          <Textarea
            id="job-desc"
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Responsibilities, schedule, what makes this a great fit…"
            rows={6}
            className="rounded-xl min-h-[140px]"
          />
          {errors?.description && <p className="text-xs text-destructive">{errors.description}</p>}
        </div>
      </Section>

      <Section icon={MapPin} title="Location & type">
        <div className="space-y-2">
          <Label htmlFor="job-location">Location</Label>
          <Input
            id="job-location"
            value={form.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="City or Remote"
            maxLength={200}
            className="rounded-xl"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Job type</Label>
            <Select value={form.jobType || "__none__"} onValueChange={(v) => onChange({ jobType: v === "__none__" ? "" : v })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {selectableTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.category || "__none__"} onValueChange={(v) => onChange({ category: v === "__none__" ? "" : v })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Not specified</SelectItem>
                {JOB_CATEGORIES.filter((c) => c.value !== "").map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section icon={IndianRupee} title="Compensation">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="job-smin">Salary from (₹ / year)</Label>
            <Input
              id="job-smin"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.salaryMin}
              onChange={(e) => onChange({ salaryMin: e.target.value })}
              placeholder="Optional"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-smax">Salary up to (₹ / year)</Label>
            <Input
              id="job-smax"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.salaryMax}
              onChange={(e) => onChange({ salaryMax: e.target.value })}
              placeholder="Optional"
              className="rounded-xl"
            />
          </div>
        </div>
      </Section>

      <Section icon={Building2} title="Requirements">
        <div className="space-y-2">
          <Label htmlFor="job-req">Skills & requirements</Label>
          <Textarea
            id="job-req"
            value={form.requirements}
            onChange={(e) => onChange({ requirements: e.target.value })}
            placeholder="Education, experience, languages…"
            rows={4}
            className="rounded-xl"
          />
        </div>
      </Section>

      <Section icon={Link2} title="How to apply">
        <div className="space-y-2">
          <Label htmlFor="job-url">Application link</Label>
          <Input
            id="job-url"
            value={form.applyUrl}
            onChange={(e) => onChange({ applyUrl: e.target.value })}
            placeholder="https://…"
            maxLength={500}
            className="rounded-xl"
          />
          {errors?.applyUrl && <p className="text-xs text-destructive">{errors.applyUrl}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="job-email">Contact email</Label>
            <Input
              id="job-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => onChange({ contactEmail: e.target.value })}
              placeholder="hr@company.com"
              maxLength={200}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-phone">Contact phone</Label>
            <Input
              id="job-phone"
              value={form.contactPhone}
              onChange={(e) => onChange({ contactPhone: e.target.value })}
              placeholder="+91…"
              maxLength={20}
              className="rounded-xl"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-deadline">Application deadline</Label>
          <Input
            id="job-deadline"
            type="datetime-local"
            value={form.deadlineLocal}
            onChange={(e) => onChange({ deadlineLocal: e.target.value })}
            className="rounded-xl"
          />
          <p className="text-[11px] text-muted-foreground">Optional. Uses your device timezone.</p>
        </div>
      </Section>
    </div>
  );
}

export function jobFormStateToPayload(form: JobListingFormState): JobFormData {
  const smin = form.salaryMin.trim() ? Number(form.salaryMin) : NaN;
  const smax = form.salaryMax.trim() ? Number(form.salaryMax) : NaN;
  return {
    title: form.title.trim(),
    company: form.company.trim(),
    description: form.description.trim(),
    location: form.location.trim() || undefined,
    jobType: form.jobType || undefined,
    category: form.category || undefined,
    requirements: form.requirements.trim() || undefined,
    salaryMin: !Number.isNaN(smin) ? smin : undefined,
    salaryMax: !Number.isNaN(smax) ? smax : undefined,
    applyUrl: form.applyUrl.trim() || undefined,
    contactEmail: form.contactEmail.trim() || undefined,
    contactPhone: form.contactPhone.trim() || undefined,
    deadline: localDatetimeToIso(form.deadlineLocal),
  };
}

export function jobDetailToFormState(d: JobDetailDto): JobListingFormState {
  return {
    title: d.title ?? "",
    company: d.company ?? "",
    description: d.description ?? "",
    location: d.location ?? "",
    jobType: d.jobType ?? "",
    category: d.category ?? "",
    requirements: d.requirements ?? "",
    salaryMin: d.salaryMin != null ? String(d.salaryMin) : "",
    salaryMax: d.salaryMax != null ? String(d.salaryMax) : "",
    applyUrl: d.applyUrl ?? "",
    contactEmail: d.contactEmail ?? "",
    contactPhone: d.contactPhone ?? "",
    deadlineLocal: isoToLocalDatetimeInput(d.deadline),
  };
}
