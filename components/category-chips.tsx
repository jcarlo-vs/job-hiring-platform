"use client";

import type { JobCategory } from "@/lib/jobs";

/** Shared multi-select chip grid used by onboarding + the settings form. */
export function CategoryChips({
  options,
  selected,
  onToggle,
  ariaLabel,
}: {
  options: { value: JobCategory; label: string }[];
  selected: JobCategory[];
  onToggle: (value: JobCategory) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(o.value)}
            className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-colors ${
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
