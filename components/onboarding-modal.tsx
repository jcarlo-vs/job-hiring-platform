"use client";

import { useEffect, useRef, useState } from "react";

import { completeOnboarding, dismissOnboarding } from "@/app/onboarding/actions";
import { CategoryChips } from "@/components/category-chips";
import type { JobCategory } from "@/lib/jobs";

/**
 * One-time welcome modal shown to a freshly registered applicant (rendered by
 * the dashboard only when onboarded_at is null). Save or Skip both stamp the
 * flag server-side, so the dashboard re-renders without it. Implements the
 * ARIA dialog contract: focus moves in on mount, Tab is trapped, Escape skips.
 */
export function OnboardingModal({
  categories,
}: {
  categories: { value: JobCategory; label: string }[];
}) {
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<JobCategory[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  function toggle(v: JobCategory) {
    setPicked((cur) =>
      cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
    );
  }

  function close() {
    setOpen(false);
    void dismissOnboarding();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusables = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Set your job interests"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="border-border relative w-full max-w-lg rounded-2xl border-2 bg-white p-6 shadow-xl outline-none"
      >
        <h2 className="text-xl font-bold">
          Welcome! What kind of roles are you looking for?
        </h2>
        <p className="text-muted mt-1 text-sm">
          Pick a few and we will feature matching jobs for you. You can change
          this anytime.
        </p>

        <div className="mt-5">
          <CategoryChips
            options={categories}
            selected={picked}
            onToggle={toggle}
            ariaLabel="Job categories"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <form action={dismissOnboarding}>
            <button
              type="submit"
              className="border-border hover:border-primary cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors"
            >
              Skip for now
            </button>
          </form>
          <form action={completeOnboarding}>
            {picked.map((c) => (
              <input key={c} type="hidden" name="categories" value={c} />
            ))}
            <button type="submit" className="btn-primary">
              Save interests
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
