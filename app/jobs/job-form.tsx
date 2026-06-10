"use client";

import { useActionState } from "react";

import type { JobFormState } from "@/app/jobs/actions";
import { Constants } from "@/lib/database.types";
import {
  EMPLOYMENT_TYPE_LABELS,
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
  expiresAt?: string;
};

export function JobForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: JobFormState, formData: FormData) => Promise<JobFormState>;
  defaults: Defaults;
  submitLabel: string;
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
          className="field-input"
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
          className="field-input"
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
            Salary min (USD)
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
            Salary max (USD)
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
        <label htmlFor="salaryPeriod" className="field-label">
          Pay period
        </label>
        <select
          id="salaryPeriod"
          name="salaryPeriod"
          defaultValue={defaults.salaryPeriod ?? "ANNUAL"}
          className="field-input"
        >
          {Constants.public.Enums.salary_period.map((p) => (
            <option key={p} value={p}>
              {SALARY_PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
        <p className="text-muted mt-1 text-xs">
          How the pay above is quoted (e.g. $10/hr or $120,000/yr).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="employmentType" className="field-label">
            Employment type
          </label>
          <select
            id="employmentType"
            name="employmentType"
            defaultValue={defaults.employmentType ?? "FULL_TIME"}
            className="field-input"
          >
            {Constants.public.Enums.employment_type.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="workMode" className="field-label">
            Work mode
          </label>
          <select
            id="workMode"
            name="workMode"
            defaultValue={defaults.workMode ?? "REMOTE"}
            className="field-input"
          >
            {Constants.public.Enums.work_mode.map((m) => (
              <option key={m} value={m}>
                {WORK_MODE_LABELS[m]}
              </option>
            ))}
          </select>
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

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
