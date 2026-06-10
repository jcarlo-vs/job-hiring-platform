"use client";

import { useActionState, useState } from "react";

import { signup, type AuthState } from "@/app/auth/actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    undefined,
  );
  const [role, setRole] = useState("APPLICANT");

  if (state?.message) {
    return <p className="form-note">{state.message}</p>;
  }

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
          autoComplete="name"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field-input"
        />
        <p className="text-muted mt-1 text-xs">At least 8 characters.</p>
      </div>

      <fieldset>
        <legend className="field-label">I am a</legend>
        <div className="grid grid-cols-2 gap-3">
          <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="radio"
              name="role"
              value="APPLICANT"
              defaultChecked
              onChange={() => setRole("APPLICANT")}
              className="accent-primary"
            />
            Job seeker
          </label>
          <label className="border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input
              type="radio"
              name="role"
              value="EMPLOYER"
              onChange={() => setRole("EMPLOYER")}
              className="accent-primary"
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
            autoComplete="organization"
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
          <p className="text-muted mt-1 text-xs">
            So the hiring team can reach you about interviews.
          </p>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
