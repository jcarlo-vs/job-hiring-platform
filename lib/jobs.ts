import { Constants, type Database } from "@/lib/database.types";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type EmploymentType = Database["public"]["Enums"]["employment_type"];
export type WorkMode = Database["public"]["Enums"]["work_mode"];
export type SalaryPeriod = Database["public"]["Enums"]["salary_period"];
export type JobCategory = Database["public"]["Enums"]["job_category"];

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

export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = {
  HOURLY: "Per hour",
  MONTHLY: "Per month",
  ANNUAL: "Per year",
};

/** Compact suffix appended to formatted pay, e.g. "$10/hr". */
export const SALARY_PERIOD_SUFFIX: Record<SalaryPeriod, string> = {
  HOURLY: "/hr",
  MONTHLY: "/mo",
  ANNUAL: "/yr",
};

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  SOFTWARE_ENGINEERING: "Software Engineering",
  DATA_AI: "Data & AI",
  DESIGN: "Design",
  PRODUCT: "Product",
  MARKETING: "Marketing",
  SALES: "Sales",
  FINANCE_ACCOUNTING: "Finance & Accounting",
  OPERATIONS: "Operations",
  CUSTOMER_SUPPORT: "Customer Support",
  HEALTHCARE: "Healthcare",
  EDUCATION: "Education",
  ENGINEERING_TRADES: "Engineering & Trades",
  LEGAL: "Legal",
  WRITING_CONTENT: "Writing & Content",
  OTHER: "Other",
};

/** Narrow an arbitrary string (e.g. a URL param) to a valid job category. */
export function isValidCategory(value: string): value is JobCategory {
  return (Constants.public.Enums.job_category as readonly string[]).includes(
    value,
  );
}

export function isExpired(job: Pick<Job, "expires_at">): boolean {
  return !!job.expires_at && new Date(job.expires_at).getTime() < Date.now();
}

export function formatSalary(
  min: number | null,
  max: number | null,
  period: SalaryPeriod = "ANNUAL",
): string | null {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  const unit = SALARY_PERIOD_SUFFIX[period];
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}${unit}`;
  if (min != null) return `From ${fmt(min)}${unit}`;
  if (max != null) return `Up to ${fmt(max)}${unit}`;
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
