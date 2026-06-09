import Link from "next/link";

import { Constants } from "@/lib/database.types";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS } from "@/lib/jobs";

type Props = {
  q?: string;
  location?: string;
  employmentType?: string;
  workMode?: string;
  salaryMin?: string;
};

// A plain GET form: submitting sets the URL query params, so search/filtering
// works without client JavaScript and produces shareable URLs.
export function JobFilters({
  q,
  location,
  employmentType,
  workMode,
  salaryMin,
}: Props) {
  return (
    <form
      method="get"
      action="/jobs"
      className="border-border grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <input
        name="q"
        defaultValue={q}
        placeholder="Search title or description"
        className="field-input lg:col-span-2"
      />
      <input
        name="location"
        defaultValue={location}
        placeholder="Location"
        className="field-input"
      />
      <select
        name="employment_type"
        defaultValue={employmentType ?? ""}
        className="field-input"
        aria-label="Employment type"
      >
        <option value="">Any type</option>
        {Constants.public.Enums.employment_type.map((t) => (
          <option key={t} value={t}>
            {EMPLOYMENT_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <select
        name="work_mode"
        defaultValue={workMode ?? ""}
        className="field-input"
        aria-label="Work mode"
      >
        <option value="">Any mode</option>
        {Constants.public.Enums.work_mode.map((m) => (
          <option key={m} value={m}>
            {WORK_MODE_LABELS[m]}
          </option>
        ))}
      </select>
      <input
        name="salary_min"
        type="number"
        min="0"
        defaultValue={salaryMin}
        placeholder="Min salary"
        className="field-input"
      />
      <div className="flex gap-3 sm:col-span-2 lg:col-span-6">
        <button type="submit" className="btn-primary">
          Search
        </button>
        <Link
          href="/jobs"
          className="text-muted self-center text-sm hover:underline"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
