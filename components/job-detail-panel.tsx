"use client";

import Link from "next/link";

import { ApplyButton } from "@/components/apply-button";
import { SalaryTag } from "@/components/salary-tag";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  WORK_MODE_LABELS,
  formatDate,
  type Job,
} from "@/lib/jobs";

/** Resolved apply CTA for the selected job (computed once in the shell). */
export type CtaState =
  | { kind: "guest" }
  | { kind: "owner" }
  | { kind: "applied" }
  | { kind: "apply"; hasResume: boolean; resumeFilename: string | null }
  | { kind: "not-applicant" };

/**
 * Pure presentational detail view for the selected job. Mirrors the standalone
 * /jobs/[id] page content; the CTA branch is resolved upstream and passed in,
 * so this component never touches Supabase.
 */
export function JobDetailPanel({ job, cta }: { job: Job; cta: CtaState }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
        <Link
          href={`/jobs/${job.id}`}
          className="text-primary shrink-0 text-sm font-semibold hover:underline"
        >
          Open full page
        </Link>
      </div>

      <div className="text-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
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
        <span>Posted {formatDate(job.created_at)}</span>
      </div>

      <section className="mt-6">
        <h3 className="font-semibold">Description</h3>
        <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {job.description}
        </p>
      </section>

      <section className="mt-6">
        <h3 className="font-semibold">Requirements and qualifications</h3>
        <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {job.requirements}
        </p>
      </section>

      <div className="border-border mt-8 border-t pt-6">
        {cta.kind === "guest" ? (
          <Link href={`/login?next=/jobs/${job.id}`} className="btn-primary">
            Sign in to apply
          </Link>
        ) : cta.kind === "owner" ? (
          <p className="text-muted text-sm">This is your job posting.</p>
        ) : cta.kind === "applied" ? (
          <p className="text-muted text-sm">
            You have applied to this job. See{" "}
            <Link href="/applications" className="text-primary hover:underline">
              My applications
            </Link>
            .
          </p>
        ) : cta.kind === "apply" ? (
          <ApplyButton
            jobId={job.id}
            hasResume={cta.hasResume}
            resumeFilename={cta.resumeFilename}
          />
        ) : (
          <p className="text-muted text-sm">
            Only job seekers can apply to jobs.
          </p>
        )}
      </div>
    </div>
  );
}
