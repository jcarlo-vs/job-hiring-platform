import { formatSalary, type SalaryPeriod } from "@/lib/jobs";

/**
 * Highlighted pay tag - pay is a key detail applicants scan for, so it gets a
 * distinct green "money" chip instead of blending into the muted meta row.
 * Renders nothing when no salary is listed (pay is optional on a posting).
 */
export function SalaryTag({
  min,
  max,
  period,
  className,
}: {
  min: number | null;
  max: number | null;
  period: SalaryPeriod;
  className?: string;
}) {
  const salary = formatSalary(min, max, period);
  if (!salary) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 font-bold text-green-800 ${
        className ?? ""
      }`}
    >
      {salary}
    </span>
  );
}
