"use server";

import { revalidatePath } from "next/cache";

import { isValidCategory, type JobCategory } from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

export type PreferencesState = { saved?: boolean; error?: string } | undefined;

/** Keep only valid, de-duplicated category codes from the submitted chips. */
function parseCategories(formData: FormData): JobCategory[] {
  const raw = formData
    .getAll("categories")
    .filter((v): v is string => typeof v === "string");
  return [...new Set(raw.filter(isValidCategory))];
}

async function actor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Onboarding "Save": store the picked interests and stamp the shown-flag. */
export async function completeOnboarding(formData: FormData): Promise<void> {
  const { supabase, user } = await actor();
  if (!user) return;
  // Update only these two columns (never role) under profiles_update_own RLS.
  await supabase
    .from("profiles")
    .update({
      preferred_categories: parseCategories(formData),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/settings/preferences");
}

/** Onboarding "Skip": stamp the shown-flag only, so it never re-appears. */
export async function dismissOnboarding(): Promise<void> {
  const { supabase, user } = await actor();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/dashboard");
}

/** Settings page: update interests only; does not touch the onboarding flag. */
export async function saveCategoryPreferences(
  _prev: PreferencesState,
  formData: FormData,
): Promise<PreferencesState> {
  const { supabase, user } = await actor();
  if (!user) return { error: "Please sign in." };
  const { error } = await supabase
    .from("profiles")
    .update({ preferred_categories: parseCategories(formData) })
    .eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/settings/preferences");
  return { saved: true };
}
