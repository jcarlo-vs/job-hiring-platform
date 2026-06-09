"use server";

import { revalidatePath } from "next/cache";

import { PIPELINE_STAGES, type ApplicationStage } from "@/lib/applications";
import { createClient } from "@/utils/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Move a candidate to a new stage. The update runs under the employer's own
 * session, so the `applications_update_employer` RLS policy (private.owns_job)
 * enforces that only the employer who owns this application's job can change it
 * - a non-owner's update simply matches zero rows. The stage value is validated
 * here as defense in depth.
 */
export async function updateApplicationStage(
  jobId: string,
  applicationId: string,
  stage: ApplicationStage,
): Promise<ActionResult> {
  if (!PIPELINE_STAGES.includes(stage)) {
    return { ok: false, error: "Invalid stage." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data, error } = await supabase
    .from("applications")
    .update({ stage })
    .eq("id", applicationId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Not found, or you do not own this job." };
  }

  revalidatePath(`/jobs/${jobId}/applicants`);
  revalidatePath(`/jobs/${jobId}/applicants/${applicationId}`);
  return { ok: true };
}
