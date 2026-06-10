import Link from "next/link";
import { redirect } from "next/navigation";

import { closeJob, reopenJob } from "@/app/jobs/actions";
import { OnboardingModal } from "@/components/onboarding-modal";
import { ResumeManager } from "@/components/resume-manager";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type ApplicationStage,
} from "@/lib/applications";
import { getProfile } from "@/lib/auth";
import { Constants } from "@/lib/database.types";
import {
  JOB_CATEGORY_LABELS,
  formatDate,
  isExpired,
  type Job,
} from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

type StageCounts = { total: number; byStage: Partial<Record<ApplicationStage, number>> };

const categoryOptions = Constants.public.Enums.job_category.map((c) => ({
  value: c,
  label: JOB_CATEGORY_LABELS[c],
}));

export default async function DashboardPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  if (profile.role === "EMPLOYER") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("employer_id", profile.id)
      .order("created_at", { ascending: false });

    const all = data ?? [];
    const active = all.filter((j) => j.status === "OPEN" && !isExpired(j));
    const expired = all.filter((j) => j.status === "OPEN" && isExpired(j));
    const closed = all.filter((j) => j.status === "CLOSED");

    // Applicant counts per stage, per job (RLS lets an employer read
    // applications for jobs they own). Aggregated in-memory at portfolio volume.
    const jobIds = all.map((j) => j.id);
    const { data: apps } = jobIds.length
      ? await supabase
          .from("applications")
          .select("job_id, stage")
          .in("job_id", jobIds)
      : { data: [] };
    const countsByJob = new Map<string, StageCounts>();
    for (const a of apps ?? []) {
      const c = countsByJob.get(a.job_id) ?? { total: 0, byStage: {} };
      c.total += 1;
      c.byStage[a.stage] = (c.byStage[a.stage] ?? 0) + 1;
      countsByJob.set(a.job_id, c);
    }

    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted text-sm">Employer dashboard</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Welcome, {firstName}
            </h1>
          </div>
          <Link href="/jobs/new" className="btn-primary">
            Post a job
          </Link>
        </div>

        {all.length === 0 ? (
          <div className="border-border text-muted mt-10 rounded-lg border border-dashed p-12 text-center text-sm">
            You have not posted any jobs yet.
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            <Section
              title={`Active (${active.length})`}
              jobs={active}
              counts={countsByJob}
              empty="No active postings."
            />
            {expired.length > 0 && (
              <Section
                title={`Expired (${expired.length})`}
                jobs={expired}
                counts={countsByJob}
              />
            )}
            {closed.length > 0 && (
              <Section
                title={`Closed (${closed.length})`}
                jobs={closed}
                counts={countsByJob}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  const needsOnboarding = profile.onboarded_at == null;
  const prefs = profile.preferred_categories ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {needsOnboarding && <OnboardingModal categories={categoryOptions} />}
      <p className="text-muted text-sm">Your dashboard</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        Welcome, {firstName}
      </h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <ResumeManager
          filename={profile.resume_filename}
          uploadedAt={profile.resume_uploaded_at}
        />
        <section className="border-border rounded-lg border p-6">
          <h2 className="font-medium">Your applications</h2>
          <p className="text-muted mt-2 text-sm">
            Track the stage and AI screening of jobs you have applied to.
          </p>
          <Link
            href="/applications"
            className="text-primary mt-4 inline-block text-sm hover:underline"
          >
            View my applications
          </Link>
        </section>
        <section className="border-border rounded-lg border p-6">
          <h2 className="font-medium">Job interests</h2>
          {prefs.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {prefs.map((c) => (
                <span
                  key={c}
                  className="border-border rounded-full border px-2 py-0.5 text-xs"
                >
                  {JOB_CATEGORY_LABELS[c]}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-muted mt-2 text-sm">
              You have not set any interests yet.
            </p>
          )}
          <Link
            href="/settings/preferences"
            className="text-primary mt-4 inline-block text-sm hover:underline"
          >
            Edit interests
          </Link>
        </section>
      </div>
      <Link
        href="/jobs"
        className="text-primary mt-8 inline-block text-sm hover:underline"
      >
        Browse jobs
      </Link>
    </div>
  );
}

function Section({
  title,
  jobs,
  counts,
  empty,
}: {
  title: string;
  jobs: Job[];
  counts: Map<string, StageCounts>;
  empty?: string;
}) {
  return (
    <div>
      <h2 className="text-muted text-sm font-medium tracking-wide uppercase">
        {title}
      </h2>
      {jobs.length === 0 ? (
        <p className="text-muted mt-2 text-sm">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {jobs.map((job) => (
            <JobManageRow key={job.id} job={job} counts={counts.get(job.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobManageRow({ job, counts }: { job: Job; counts?: StageCounts }) {
  const expired = isExpired(job);
  const total = counts?.total ?? 0;
  return (
    <li className="border-border flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
      <div className="min-w-0">
        <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">
          {job.title}
        </Link>
        <p className="text-muted mt-1 text-xs">
          Posted {formatDate(job.created_at)}
          {job.expires_at
            ? ` - ${expired ? "expired" : "expires"} ${formatDate(job.expires_at)}`
            : ""}
        </p>
        {total > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PIPELINE_STAGES.filter((s) => counts?.byStage[s]).map((s) => (
              <span
                key={s}
                className="border-border rounded-full border px-2 py-0.5 text-xs"
              >
                {counts?.byStage[s]} {STAGE_LABELS[s]}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted mt-2 text-xs">No applicants yet</p>
        )}
      </div>
      <div className="text-muted flex items-center gap-3 text-sm">
        <Link
          href={`/jobs/${job.id}/applicants`}
          className="text-primary font-semibold hover:underline"
        >
          {total > 0 ? `Applicants (${total})` : "Applicants"}
        </Link>
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
              Reopen
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
