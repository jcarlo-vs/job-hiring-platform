import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  RECOMMENDATION_BADGE_CLASS,
  RECOMMENDATION_LABELS,
  SCREENING_LABELS,
  STAGE_LABELS,
} from "@/lib/applications";
import { getUser } from "@/lib/auth";
import { resumeExtension } from "@/lib/resume";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/utils/supabase/server";

import { CandidateActions } from "./candidate-actions";
import { ResumeViewer } from "./resume-viewer";

/** Read a jsonb column that holds a string array, defensively. */
function asList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string; applicationId: string }>;
}) {
  const { id: jobId, applicationId } = await params;

  const user = await getUser();
  if (!user) {
    redirect(`/login?next=/jobs/${jobId}/applicants/${applicationId}`);
  }

  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, employer_id")
    .eq("id", jobId)
    .single();
  if (!job || job.employer_id !== user.id) notFound();

  // RLS (private.owns_job) also gates this read; the explicit check above keeps
  // the not-found path clean.
  const { data: app } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .eq("job_id", jobId)
    .single();
  if (!app) notFound();

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", app.applicant_id)
    .single();
  const name = profile?.full_name || "Candidate";

  // Served same-origin via the resume route (reliable embedding + the modal).
  const isPdf = app.resume_path
    ? resumeExtension(app.resume_path) === "pdf"
    : false;
  const resumeSrc = app.resume_path ? `/api/resume/${app.id}` : null;

  const matched = asList(app.ai_matched);
  const missing = asList(app.ai_missing);
  const flags = asList(app.ai_flags);
  const done = app.screening_status === "DONE";
  const canRescreen =
    app.screening_status === "DONE" || app.screening_status === "ERROR";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/jobs/${jobId}/applicants`}
        className="text-muted text-sm hover:underline"
      >
        &larr; All applicants
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <span className="border-border rounded-full border px-3 py-1 text-sm">
          {STAGE_LABELS[app.stage]}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: AI screening + actions */}
        <div className="space-y-6">
          <section className="border-border rounded-2xl border-2 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">AI screening</h2>
              <span className="text-muted text-xs">
                {SCREENING_LABELS[app.screening_status]}
              </span>
            </div>

            {done ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold tabular-nums">
                    {app.ai_score ?? "-"}
                  </span>
                  <span className="text-muted text-sm">/ 100</span>
                  {app.ai_recommendation && (
                    <span
                      className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold ${RECOMMENDATION_BADGE_CLASS[app.ai_recommendation]}`}
                    >
                      {RECOMMENDATION_LABELS[app.ai_recommendation]}
                    </span>
                  )}
                </div>

                {app.ai_summary && (
                  <p className="text-sm leading-relaxed">{app.ai_summary}</p>
                )}

                <RequirementList
                  title="Matches"
                  items={matched}
                  marker="+"
                  markerClass="text-green-600"
                />
                <RequirementList
                  title="Gaps"
                  items={missing}
                  marker="-"
                  markerClass="text-amber-600"
                />
                {flags.length > 0 && (
                  <RequirementList
                    title="Flags"
                    items={flags}
                    marker="!"
                    markerClass="text-red-600"
                  />
                )}

                <p className="text-muted border-border border-t pt-3 text-xs">
                  AI screening is advisory only. You make the final decision.
                </p>
              </div>
            ) : app.screening_status === "ERROR" ? (
              <p className="form-error mt-4">
                Screening failed. Try re-running it below.
              </p>
            ) : (
              <p className="text-muted mt-4 text-sm">
                Screening is {app.screening_status === "PROCESSING" ? "in progress" : "queued"}. Refresh in a moment.
              </p>
            )}
          </section>

          <section className="border-border rounded-2xl border-2 bg-white p-6">
            <h2 className="font-semibold">Move candidate</h2>
            <div className="mt-4">
              <CandidateActions
                jobId={jobId}
                applicationId={app.id}
                stage={app.stage}
                canRescreen={canRescreen}
              />
            </div>
          </section>
        </div>

        {/* Right: resume */}
        <section className="border-border rounded-2xl border-2 bg-white p-6">
          <h2 className="font-semibold">Resume</h2>
          <ResumeViewer src={resumeSrc} isPdf={isPdf} name={name} />
        </section>
      </div>
    </div>
  );
}

function RequirementList({
  title,
  items,
  marker,
  markerClass,
}: {
  title: string;
  items: string[];
  marker: string;
  markerClass: string;
}) {
  if (items.length === 0) {
    return (
      <div>
        <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
          {title}
        </h3>
        <p className="text-muted mt-1 text-sm">None noted.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-muted text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      <ul className="mt-1 space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className={`font-bold ${markerClass}`}>{marker}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
