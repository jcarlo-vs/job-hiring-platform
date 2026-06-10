import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/ui/back-button";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { ApplicantsView, type ApplicantRow } from "./applicants-view";

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = await params;

  const user = await getUser();
  if (!user) redirect(`/login?next=/jobs/${jobId}/applicants`);

  const supabase = await createClient();

  // Ownership check: jobs_select lets anyone read an OPEN job, so verify the
  // caller is the owning employer before exposing the applicant list.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, status, employer_id")
    .eq("id", jobId)
    .single();
  if (!job || job.employer_id !== user.id) notFound();

  // Applications for this job (RLS: applications_select via private.owns_job).
  const { data: apps } = await supabase
    .from("applications")
    .select(
      "id, applicant_id, created_at, stage, screening_status, ai_score, ai_recommendation",
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  // Applicant names. profiles RLS only exposes the caller's own row, so read
  // names with the service role - authorized because ownership is verified above.
  const applicantIds = [...new Set((apps ?? []).map((a) => a.applicant_id))];
  const admin = createAdminClient();
  const { data: profiles } = applicantIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", applicantIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name]),
  );

  const applicants: ApplicantRow[] = (apps ?? []).map((a) => ({
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
