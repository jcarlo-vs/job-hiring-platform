import Link from "next/link";

import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  formatSalary,
  type Job,
} from "@/lib/jobs";

export function JobCard({ job }: { job: Job }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_period);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="border-border hover:border-primary block rounded-lg border p-5 transition-colors"
    >
      <h3 className="font-medium">{job.title}</h3>
      <div className="text-muted mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {job.location && <span>{job.location}</span>}
        <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</span>
        <span>{WORK_MODE_LABELS[job.work_mode]}</span>
        {salary && <span>{salary}</span>}
      </div>
      <p className="text-muted mt-3 line-clamp-2 text-sm">{job.description}</p>
    </Link>
  );
}
