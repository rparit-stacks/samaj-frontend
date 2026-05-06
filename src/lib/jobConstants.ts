export const JOB_TYPES = [
  { label: "All Types", value: "" },
  { label: "Full-time", value: "FULL_TIME" },
  { label: "Part-time", value: "PART_TIME" },
  { label: "Contract", value: "CONTRACT" },
  { label: "Internship", value: "INTERNSHIP" },
  { label: "Freelance", value: "FREELANCE" },
  { label: "Remote", value: "REMOTE" },
] as const;

export const JOB_CATEGORIES = [
  { label: "All", value: "" },
  { label: "Technology", value: "Technology" },
  { label: "Finance", value: "Finance" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "Education", value: "Education" },
  { label: "Sales", value: "Sales" },
  { label: "Operations", value: "Operations" },
  { label: "Other", value: "Other" },
] as const;

export function jobTypeLabel(type: string | null) {
  return JOB_TYPES.find((t) => t.value === type)?.label ?? type ?? "";
}

export function jobTypeBadgeClass(type: string | null) {
  switch (type) {
    case "FULL_TIME":
      return "bg-green-100 text-green-800";
    case "PART_TIME":
      return "bg-blue-100 text-blue-800";
    case "CONTRACT":
      return "bg-purple-100 text-purple-800";
    case "INTERNSHIP":
      return "bg-orange-100 text-orange-800";
    case "FREELANCE":
      return "bg-pink-100 text-pink-800";
    case "REMOTE":
      return "bg-teal-100 text-teal-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export function jobSalaryLabel(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
      : `₹${(n / 1000).toFixed(0)}K`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export function jobDeadlineLabel(deadline: string | null): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (days < 0) return { text: "Closed", urgent: true };
  if (days === 0) return { text: "Closes today", urgent: true };
  if (days <= 3) return { text: `${days}d left`, urgent: true };
  return { text: `${days}d left`, urgent: false };
}

/** API expects ISO-8601 instant; empty string omits field */
export function localDatetimeToIso(local: string): string | undefined {
  if (!local?.trim()) return undefined;
  const t = new Date(local).getTime();
  if (Number.isNaN(t)) return undefined;
  return new Date(t).toISOString();
}

export function isoToLocalDatetimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
