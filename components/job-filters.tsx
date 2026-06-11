"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Select } from "@/components/ui/select";
import { Constants } from "@/lib/database.types";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/jobs";

type Props = {
  q?: string;
  location?: string;
  employmentType?: string;
  workMode?: string;
  salaryMin?: string;
  category?: string;
};

const typeOptions = [
  { value: "", label: "Any type" },
  ...Constants.public.Enums.employment_type.map((t) => ({
    value: t,
    label: EMPLOYMENT_TYPE_LABELS[t],
  })),
];

const modeOptions = [
  { value: "", label: "Any mode" },
  ...Constants.public.Enums.work_mode.map((m) => ({
    value: m,
    label: WORK_MODE_LABELS[m],
  })),
];

const categoryOptions = [
  { value: "", label: "Any category" },
  ...Constants.public.Enums.job_category.map((c) => ({
    value: c,
    label: JOB_CATEGORY_LABELS[c],
  })),
];

const FIELDS = [
  "q",
  "location",
  "employment_type",
  "work_mode",
  "category",
  "salary_min",
] as const;

// A GET form (so it works with no JS + produces shareable URLs), but JS upgrades
// the submit to a fast client-side navigation with a pending state instead of a
// full-page reload.
export function JobFilters({
  q,
  location,
  employmentType,
  workMode,
  salaryMin,
  category,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const key of FIELDS) {
      const value = data.get(key);
      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value.trim());
      }
    }
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/jobs?${qs}` : "/jobs"));
  }

  return (
    <form
      method="get"
      action="/jobs"
      onSubmit={onSubmit}
      className="border-border grid gap-3 rounded-2xl border-2 bg-white p-4 sm:grid-cols-2 lg:grid-cols-7"
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
      <Select
        name="employment_type"
        defaultValue={employmentType ?? ""}
        options={typeOptions}
        ariaLabel="Employment type"
      />
      <Select
        name="work_mode"
        defaultValue={workMode ?? ""}
        options={modeOptions}
        ariaLabel="Work mode"
      />
      <Select
        name="category"
        defaultValue={category ?? ""}
        options={categoryOptions}
        ariaLabel="Category"
      />
      <input
        name="salary_min"
        type="number"
        min="0"
        defaultValue={salaryMin}
        placeholder="Min salary"
        className="field-input"
      />
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-7">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Searching..." : "Search"}
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
