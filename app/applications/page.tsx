import Link from "next/link";
import { redirect } from "next/navigation";

import {
  APPLICANT_MILESTONES,
  applicantStatus,
  type ApplicantStatusTone,
} from "@/lib/applications";
import { getProfile } from "@/lib/auth";
import { formatDate } from "@/lib/jobs";
import { asUser } from "@/lib/db";
import type { Database } from "@/lib/database.types";

const TONE_CLASS: Record<ApplicantStatusTone, string> = {
  pending: "border-border text-muted bg-white",
  active: "border-primary/40 text-primary bg-primary/10",
  good: "border-green-300 text-green-800 bg-green-50",
  closed: "border-red-200 text-red-700 bg-red-50",
};

/** Read a jsonb string-array column defensively. */
function asList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

export default async function ApplicationsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/applications");

  // One join instead of two round trips. jobs_select_open_or_own lets an
  // applicant read a job they applied to even after it closes, so the title
  // still resolves for historic applications.
  const applications = await asUser((db) =>
    db.query<{
      id: string;
      created_at: string;
      stage: Database["public"]["Enums"]["application_stage"];
      screening_status: Database["public"]["Enums"]["screening_status"];
      job_id: string;
      ai_matched: unknown;
      ai_recommendation: Database["public"]["Enums"]["ai_recommendation"] | null;
      job_title: string | null;
    }>(
      `select a.id, a.created_at, a.stage, a.screening_status, a.job_id,
              a.ai_matched, a.ai_recommendation, j.title as job_title
         from public.applications a
         left join public.jobs j on j.id = a.job_id
        where a.applicant_id = $1
        order by a.created_at desc`,
      [profile.id],
    ),
  );

  const titleById = new Map(
    applications.map((a) => [a.job_id, a.job_title ?? ""]),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My applications</h1>
      <p className="text-muted mt-1 text-sm">
        Track where each application stands - it updates as the team reviews you.
      </p>

      {applications.length === 0 ? (
        <div className="border-border text-muted mt-8 rounded-2xl border-2 border-dashed p-12 text-center text-sm">
          You have not applied to any jobs yet.{" "}
          <Link href="/jobs" className="text-primary hover:underline">
            Browse jobs
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {applications.map((a) => {
            const status = applicantStatus(
              a.stage,
              a.screening_status,
              a.ai_recommendation,
            );
            const strengths = asList(a.ai_matched).slice(0, 5);
            return (
              <li
                key={a.id}
                className="border-border rounded-2xl border-2 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/jobs/${a.job_id}`}
                      className="font-bold hover:underline"
                    >
                      {titleById.get(a.job_id) ?? "Job posting"}
                    </Link>
                    <p className="text-muted mt-0.5 text-xs">
                      Applied {formatDate(a.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${TONE_CLASS[status.tone]}`}
                  >
                    {status.label}
                  </span>
                </div>

                <p className="text-muted mt-3 text-sm leading-relaxed">
                  {status.blurb}
                </p>

                {status.milestone >= 0 && (
                  <ol className="mt-4 flex items-center">
                    {APPLICANT_MILESTONES.map((m, i) => {
                      const reached = i <= status.milestone;
                      const last = i === APPLICANT_MILESTONES.length - 1;
                      return (
                        <li
                          key={m}
                          className={`flex items-center ${last ? "" : "flex-1"}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`h-3 w-3 rounded-full ${
                                reached
                                  ? "bg-primary"
                                  : "border-border border-2 bg-white"
                              }`}
                            />
                            <span
                              className={`text-[11px] font-semibold ${
                                reached ? "text-foreground" : "text-muted"
                              }`}
                            >
                              {m}
                            </span>
                          </div>
                          {!last && (
                            <span
                              className={`mx-1 mb-4 h-0.5 flex-1 rounded-full ${
                                i < status.milestone ? "bg-primary" : "bg-border"
                              }`}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}

                {status.showStrengths && strengths.length > 0 && (
                  <div className="border-border mt-4 border-t pt-3">
                    <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                      What stood out
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {strengths.map((s, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
