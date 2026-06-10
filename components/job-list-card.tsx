"use client";

import { SalaryTag } from "@/components/salary-tag";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  WORK_MODE_LABELS,
  formatDate,
  type Job,
} from "@/lib/jobs";

/**
 * A selectable job card for the desktop master-detail list. Rendered as a
 * button (role=option) so selection never navigates and there is no nested
 * anchor. Selected state gets a violet border + ring.
 */
export function JobListCard({
  job,
  selected,
  onSelect,
}: {
  job: Job;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      id={`job-opt-${job.id}`}
      aria-selected={selected}
      tabIndex={-1}
      onClick={() => onSelect(job.id)}
      className={`block w-full rounded-2xl border-2 bg-white p-5 text-left transition-colors ${
        selected
          ? "border-primary ring-primary/30 bg-primary/5 ring-2"
          : "border-border hover:border-primary"
      }`}
    >
      <h3 className="font-bold">{job.title}</h3>
      <div className="text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-primary font-semibold">
          {JOB_CATEGORY_LABELS[job.category]}
        </span>
        {job.location && <span>{job.location}</span>}
        <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</span>
        <span>{WORK_MODE_LABELS[job.work_mode]}</span>
        <SalaryTag
          min={job.salary_min}
          max={job.salary_max}
          period={job.salary_period}
        />
      </div>
      <p className="text-muted mt-3 line-clamp-2 text-sm">{job.description}</p>
      <p className="text-muted mt-3 text-xs">
        Posted {formatDate(job.created_at)}
      </p>
    </button>
  );
}
