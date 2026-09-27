import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/ui/back-button";
import { getUser } from "@/lib/auth";
import { asAdmin, asUser } from "@/lib/db";
import type { Database } from "@/lib/database.types";

import { ApplicantsView, type ApplicantRow } from "./applicants-view";

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = await params;

  const user = await getUser();
  if (!user) redirect(`/login?next=/jobs/${jobId}/applicants`);

  // Ownership check: jobs_select lets anyone read an OPEN job, so verify the
  // caller is the owning employer before exposing the applicant list.
  const job = await asUser((db) =>
    db.one<{
      id: string;
      title: string;
      status: Database["public"]["Enums"]["job_status"];
      employer_id: string;
    }>(
      `select id, title, status, employer_id from public.jobs where id = $1`,
      [jobId],
    ),
  );
  if (!job || job.employer_id !== user.sub) notFound();

  // Applications for this job, under RLS: applications_select via owns_job.
  const apps = await asUser((db) =>
    db.query<{
      id: string;
      applicant_id: string;
      created_at: string;
      stage: Database["public"]["Enums"]["application_stage"];
      screening_status: Database["public"]["Enums"]["screening_status"];
      ai_score: number | null;
      ai_recommendation: Database["public"]["Enums"]["ai_recommendation"] | null;
    }>(
      `select id, applicant_id, created_at, stage, screening_status,
              ai_score, ai_recommendation
         from public.applications
        where job_id = $1
        order by created_at desc`,
      [jobId],
    ),
  );

  // Applicant names. profiles_select_own only exposes the caller's OWN row, so
  // these have to come over the admin connection - authorized because ownership
  // was verified above. Read only.
  const applicantIds = [...new Set(apps.map((a) => a.applicant_id))];
  const profiles = applicantIds.length
    ? await asAdmin((db) =>
        db.query<{ id: string; full_name: string | null }>(
          `select id, full_name from public.profiles where id = any($1::uuid[])`,
          [applicantIds],
        ),
      )
    : [];
  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

  const applicants: ApplicantRow[] = apps.map((a) => ({
    id: a.id,
    applicantName: nameById.get(a.applicant_id) || "Candidate",
    appliedAt: a.created_at,
    stage: a.stage,
    screeningStatus: a.screening_status,
    aiScore: a.ai_score,
    aiRecommendation: a.ai_recommendation,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <BackButton href="/dashboard" label="Dashboard" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
        <Link
          href={`/jobs/${jobId}`}
          className="border-border hover:border-primary inline-flex items-center gap-1.5 rounded-full border-2 bg-white px-4 py-1.5 text-sm font-bold transition-colors"
        >
          View posting
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path
              d="M5 15L15 5M15 5H8M15 5v7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
      <p className="text-muted mt-1 text-sm">
        {applicants.length} applicant{applicants.length === 1 ? "" : "s"}
      </p>

      {applicants.length === 0 ? (
        <div className="border-border text-muted mt-8 rounded-lg border border-dashed p-12 text-center text-sm">
          No one has applied to this job yet.
        </div>
      ) : (
        <ApplicantsView jobId={jobId} applicants={applicants} />
      )}
    </div>
  );
}
