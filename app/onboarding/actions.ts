"use server";

import { revalidatePath } from "next/cache";

import { getUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { isValidCategory, type JobCategory } from "@/lib/jobs";

export type PreferencesState = { saved?: boolean; error?: string } | undefined;

/** Keep only valid, de-duplicated category codes from the submitted chips. */
function parseCategories(formData: FormData): JobCategory[] {
  const raw = formData
    .getAll("categories")
    .filter((v): v is string => typeof v === "string");
  return [...new Set(raw.filter(isValidCategory))];
}



/** Onboarding "Save": store the picked interests and stamp the shown-flag. */
export async function completeOnboarding(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) return;
  // Only these two columns (never role), under profiles_update_own RLS.
  await asUser((db) =>
    db.query(
      `update public.profiles
          set preferred_categories = $2::public.job_category[],
              onboarded_at = now()
        where id = $1`,
      [user.sub, parseCategories(formData)],
    ),
  );
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/settings/preferences");
}

/** Onboarding "Skip": stamp the shown-flag only, so it never re-appears. */
export async function dismissOnboarding(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  await asUser((db) =>
    db.query(
      `update public.profiles set onboarded_at = now() where id = $1`,
      [user.sub],
    ),
  );
  revalidatePath("/dashboard");
}

/** Settings page: update interests only; does not touch the onboarding flag. */
export async function saveCategoryPreferences(
  _prev: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  const user = await getUser();
  if (!user) return { error: "Please sign in." };
  try {
    await asUser((db) =>
      db.query(
        `update public.profiles
            set preferred_categories = $2::public.job_category[]
          where id = $1`,
        [user.sub, parseCategories(formData)],
      ),
    );
  } catch (err) {
    console.error("[preferences]", err);
    return { error: "Could not save your preferences." };
  }
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/settings/preferences");
  return { saved: true };
}
