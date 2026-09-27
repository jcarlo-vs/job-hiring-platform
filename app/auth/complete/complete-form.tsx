"use client";

import { useActionState, useState } from "react";

import {
  completeSocialSignup,
  type CompleteState,
} from "@/app/auth/complete/actions";

/**
 * Asked once, after a first Google sign-in. Google gives us an identity but not
 * whether someone is hiring or looking for work, and that choice is permanent
 * enough that guessing it would be worse than one extra screen.
 */
export function CompleteForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<CompleteState, FormData>(
    completeSocialSignup,
    undefined,
  );
  const [role, setRole] = useState("APPLICANT");

  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="form-error">{state.error}</p>}

      <div>
        <label htmlFor="fullName" className="field-label">
          Full name
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          defaultValue={defaultName}
          autoComplete="name"
          className="field-input"
        />
      </div>

      <fieldset>
        <legend className="field-label">I am a</legend>
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="role"
              value="APPLICANT"
              checked={role === "APPLICANT"}
              onChange={() => setRole("APPLICANT")}
            />
            Job seeker
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="role"
              value="EMPLOYER"
              checked={role === "EMPLOYER"}
              onChange={() => setRole("EMPLOYER")}
            />
            Employer
          </label>
        </div>
      </fieldset>

      {role === "EMPLOYER" ? (
        <div>
          <label htmlFor="companyName" className="field-label">
            Company or project name
          </label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            required
            className="field-input"
          />
        </div>
      ) : (
        <div>
          <label htmlFor="phone" className="field-label">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            className="field-input"
          />
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Finishing..." : "Finish setting up"}
      </button>
    </form>
  );
}
