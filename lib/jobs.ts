import type { Database } from "@/lib/database.types";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type EmploymentType = Database["public"]["Enums"]["employment_type"];
export type WorkMode = Database["public"]["Enums"]["work_mode"];

export const PAGE_SIZE = 9;

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: "Remote",
  ONSITE: "On-site",
  HYBRID: "Hybrid",
};

export function isExpired(job: Pick<Job, "expires_at">): boolean {
  return !!job.expires_at && new Date(job.expires_at).getTime() < Date.now();
}

export function formatSalary(
  min: number | null,
  max: number | null,
): string | null {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  if (max != null) return `Up to ${fmt(max)}`;
  return null;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** YYYY-MM-DD string `days` from now, for date inputs. */
export function dateInputValue(days = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
