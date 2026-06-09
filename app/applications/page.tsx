import Link from "next/link";
import { redirect } from "next/navigation";

import { SCREENING_LABELS, STAGE_LABELS } from "@/lib/applications";
import { getProfile } from "@/lib/auth";
import { formatDate } from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

export default async function ApplicationsPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/applications");

  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, created_at, stage, screening_status, job_id")
    .eq("applicant_id", profile.id)
    .order("created_at", { ascending: false });

  const applications = data ?? [];
  const jobIds = [...new Set(applications.map((a) => a.job_id))];
  const { data: jobs } = jobIds.length
    ? await supabase.from("jobs").select("id, title").in("id", jobIds)
    : { data: [] };
  const titleById = new Map((jobs ?? []).map((j) => [j.id, j.title]));

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My applications</h1>

      {applications.length === 0 ? (
        <div className="border-border text-muted mt-8 rounded-lg border border-dashed p-12 text-center text-sm">
          You have not applied to any jobs yet.{" "}
          <Link href="/jobs" className="text-primary hover:underline">
            Browse jobs
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {applications.map((a) => (
            <li
              key={a.id}
              className="border-border flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
            >
              <div>
                <Link
                  href={`/jobs/${a.job_id}`}
                  className="font-medium hover:underline"
                >
                  {titleById.get(a.job_id) ?? "Job posting"}
                </Link>
                <p className="text-muted mt-1 text-xs">
                  Applied {formatDate(a.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="border-border rounded-full border px-2 py-1">
                  {STAGE_LABELS[a.stage]}
                </span>
                <span className="text-muted">
                  {SCREENING_LABELS[a.screening_status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
