import Link from "next/link";

import { closeJob, reopenJob } from "@/app/jobs/actions";
import { ApplyButton } from "@/components/apply-button";
import {
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
  formatDate,
  formatSalary,
  isExpired,
} from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!job) return <JobUnavailable />;

  const isOwner = user?.id === job.employer_id;
  const expired = isExpired(job);

  // Non-owners may only view open, unexpired jobs.
  if (!isOwner && (job.status !== "OPEN" || expired)) {
    return <JobUnavailable />;
  }

  let viewerRole: string | null = null;
  let hasResume = false;
  let resumeFilename: string | null = null;
  let alreadyApplied = false;
  if (user && !isOwner) {
    const { data: vp } = await supabase
      .from("profiles")
      .select("role, resume_path, resume_filename")
      .eq("id", user.id)
      .single();
    viewerRole = vp?.role ?? null;
    hasResume = !!vp?.resume_path;
    resumeFilename = vp?.resume_filename ?? null;
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", job.id)
      .eq("applicant_id", user.id)
      .maybeSingle();
    alreadyApplied = !!existing;
  }

  const salary = formatSalary(job.salary_min, job.salary_max);

  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/jobs" className="text-muted text-sm hover:underline">
        &larr; All jobs
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {job.title}
      </h1>
      <div className="text-muted mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {job.location && <span>{job.location}</span>}
        <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type]}</span>
        <span>{WORK_MODE_LABELS[job.work_mode]}</span>
        {salary && <span>{salary}</span>}
        <span>Posted {formatDate(job.created_at)}</span>
      </div>

      {isOwner && (
        <div className="border-border mt-5 flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
          <span className="text-muted">Your posting:</span>
          <span>
            {job.status === "OPEN" ? (expired ? "Expired" : "Open") : "Closed"}
          </span>
          <Link
            href={`/jobs/${job.id}/edit`}
            className="text-primary hover:underline"
          >
            Edit
          </Link>
          {job.status === "OPEN" ? (
            <form action={closeJob.bind(null, job.id)}>
              <button type="submit" className="text-primary hover:underline">
                Close
              </button>
            </form>
          ) : (
            <form action={reopenJob.bind(null, job.id)}>
              <button type="submit" className="text-primary hover:underline">
                Reopen (30 days)
              </button>
            </form>
          )}
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-medium">Description</h2>
        <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {job.description}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Requirements and qualifications</h2>
        <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {job.requirements}
        </p>
      </section>

      <div className="border-border mt-8 border-t pt-6">
        {!user ? (
          <Link href={`/login?next=/jobs/${job.id}`} className="btn-primary">
            Sign in to apply
          </Link>
        ) : isOwner ? (
          <p className="text-muted text-sm">This is your job posting.</p>
        ) : alreadyApplied ? (
          <p className="text-muted text-sm">
            You have applied to this job. See{" "}
            <Link href="/applications" className="text-primary hover:underline">
              My applications
            </Link>
            .
          </p>
        ) : viewerRole === "APPLICANT" ? (
          <ApplyButton
            jobId={job.id}
            hasResume={hasResume}
            resumeFilename={resumeFilename}
          />
        ) : (
          <p className="text-muted text-sm">
            Only job seekers can apply to jobs.
          </p>
        )}
      </div>
    </article>
  );
}

function JobUnavailable() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="text-xl font-semibold">Job not available</h1>
      <p className="text-muted mt-2 text-sm">
        This posting may have been closed, expired, or removed.
      </p>
      <Link href="/jobs" className="btn-primary mt-6 inline-block">
        Browse jobs
      </Link>
    </div>
  );
}
