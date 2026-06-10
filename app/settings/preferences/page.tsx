import { redirect } from "next/navigation";

import { CategoryPreferencesForm } from "@/components/category-preferences-form";
import { getProfile } from "@/lib/auth";
import { Constants } from "@/lib/database.types";
import { JOB_CATEGORY_LABELS } from "@/lib/jobs";

const categoryOptions = Constants.public.Enums.job_category.map((c) => ({
  value: c,
  label: JOB_CATEGORY_LABELS[c],
}));

export default async function PreferencesPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/settings/preferences");
  if (profile.role === "EMPLOYER") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Job interests</h1>
      <p className="text-muted mt-1 text-sm">
        Pick the categories you are looking for. We will feature matching roles
        when you browse jobs.
      </p>
      <div className="mt-8">
        <CategoryPreferencesForm
          categories={categoryOptions}
          initial={profile.preferred_categories ?? []}
        />
      </div>
    </div>
  );
}
