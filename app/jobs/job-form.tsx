"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { JobFormState } from "@/app/jobs/actions";
import { Select } from "@/components/ui/select";
import { Constants } from "@/lib/database.types";
import {
  EMPLOYMENT_TYPE_LABELS,
  JOB_CATEGORY_LABELS,
  SALARY_PERIOD_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/jobs";

type Defaults = {
  title?: string;
  description?: string;
  requirements?: string;
  location?: string;
  salaryMin?: string;
  salaryMax?: string;
  salaryPeriod?: string;
  employmentType?: string;
  workMode?: string;
  category?: string;
  expiresAt?: string;
};

const salaryPeriodOptions = Constants.public.Enums.salary_period.map((p) => ({
  value: p,
  label: SALARY_PERIOD_LABELS[p],
}));
const employmentTypeOptions = Constants.public.Enums.employment_type.map((t) => ({
  value: t,
  label: EMPLOYMENT_TYPE_LABELS[t],
}));
const workModeOptions = Constants.public.Enums.work_mode.map((m) => ({
  value: m,
  label: WORK_MODE_LABELS[m],
}));
const categoryOptions = Constants.public.Enums.job_category.map((c) => ({
  value: c,
  label: JOB_CATEGORY_LABELS[c],
}));

export function JobForm({
  action,
  defaults,
  submitLabel,
  cancelHref,
}: {
  action: (state: JobFormState, formData: FormData) => Promise<JobFormState>;
  defaults: Defaults;
  submitLabel: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<JobFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="form-error">{state.error}</p>}

      <div>
        <label htmlFor="title" className="field-label">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaults.title}
          placeholder="e.g. Senior Frontend Engineer (React)"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="description" className="field-label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          defaultValue={defaults.description}
          placeholder={`What is the role, who is your team, and what will they work on day to day?

e.g. We're a small product team building a hiring platform. You'll own the candidate-facing experience end to end, ship features weekly, and work closely with design and backend.`}
          className="field-input min-h-[9rem]"
        />
      </div>

      <div>
        <label htmlFor="requirements" className="field-label">
          Requirements and qualifications
        </label>
        <textarea
          id="requirements"
          name="requirements"
          required
          rows={5}
          defaultValue={defaults.requirements}
          placeholder={`List the must-have skills, experience, and qualifications. The clearer these are, the sharper the AI screening.

e.g.
- 3+ years building web apps with React and TypeScript
- Comfortable with REST APIs and a SQL database like Postgres
- Strong communication in a remote, async team
- Nice to have: Next.js, Tailwind, CI/CD`}
          className="field-input min-h-[13rem]"
        />
        <p className="text-muted mt-1 text-xs">
          These are sent to the AI screener to match candidates.
        </p>
      </div>

      <div>
        <label htmlFor="location" className="field-label">
          Location
        </label>
        <input
          id="location"
          name="location"
          defaultValue={defaults.location}
          placeholder="e.g. Manila, or Remote"
          className="field-input"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="salaryMin" className="field-label">
            Salary min (USD, optional)
          </label>
          <input
            id="salaryMin"
            name="salaryMin"
            type="number"
            min="0"
            defaultValue={defaults.salaryMin}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="salaryMax" className="field-label">
            Salary max (USD, optional)
          </label>
          <input
            id="salaryMax"
            name="salaryMax"
            type="number"
            min="0"
            defaultValue={defaults.salaryMax}
            className="field-input"
          />
        </div>
      </div>

      <div>
        <span className="field-label">Pay period</span>
        <Select
          name="salaryPeriod"
          defaultValue={defaults.salaryPeriod ?? "ANNUAL"}
          options={salaryPeriodOptions}
          ariaLabel="Pay period"
        />
        <p className="text-muted mt-1 text-xs">
          How the pay above is quoted (e.g. $10/hr or $120,000/yr).
        </p>
      </div>

      <div>
        <span className="field-label">Category</span>
        <Select
          name="category"
          defaultValue={defaults.category ?? "OTHER"}
          options={categoryOptions}
          ariaLabel="Category"
        />
        <p className="text-muted mt-1 text-xs">
          Helps the right job seekers discover this role.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="field-label">Employment type</span>
          <Select
            name="employmentType"
            defaultValue={defaults.employmentType ?? "FULL_TIME"}
            options={employmentTypeOptions}
            ariaLabel="Employment type"
          />
        </div>
        <div>
          <span className="field-label">Work mode</span>
          <Select
            name="workMode"
            defaultValue={defaults.workMode ?? "REMOTE"}
            options={workModeOptions}
            ariaLabel="Work mode"
          />
        </div>
      </div>

      <div>
        <label htmlFor="expiresAt" className="field-label">
          Expires on
        </label>
        <input
          id="expiresAt"
          name="expiresAt"
          type="date"
          required
          defaultValue={defaults.expiresAt}
          className="field-input"
        />
        <p className="text-muted mt-1 text-xs">
          After this date the posting is hidden from the job board.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving..." : submitLabel}
        </button>
        {cancelHref && (
          <Link
            href={cancelHref}
            className="border-border hover:border-primary rounded-full border-2 px-5 py-2.5 text-sm font-bold transition-colors"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
