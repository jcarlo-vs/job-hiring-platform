"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  saveCategoryPreferences,
  type PreferencesState,
} from "@/app/onboarding/actions";
import { CategoryChips } from "@/components/category-chips";
import type { JobCategory } from "@/lib/jobs";

export function CategoryPreferencesForm({
  categories,
  initial,
}: {
  categories: { value: JobCategory; label: string }[];
  initial: JobCategory[];
}) {
  const [picked, setPicked] = useState<JobCategory[]>(initial);
  const [state, action, pending] = useActionState<PreferencesState, FormData>(
    saveCategoryPreferences,
    undefined,
  );

  function toggle(v: JobCategory) {
    setPicked((cur) =>
      cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    );
  }

  return (
    <form action={action} className="space-y-5">
      <CategoryChips
        options={categories}
        selected={picked}
        onToggle={toggle}
        ariaLabel="Job categories"
      />
      {picked.map((c) => (
        <input key={c} type="hidden" name="categories" value={c} />
      ))}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving..." : "Save"}
        </button>
        <Link
          href="/jobs"
          className="text-primary text-sm font-semibold hover:underline"
        >
          Browse matching jobs
        </Link>
        {state?.error && <span className="form-error">{state.error}</span>}
        {state?.saved && (
          <span className="text-sm font-semibold text-green-700">Saved.</span>
        )}
      </div>
    </form>
  );
}
