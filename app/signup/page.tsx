import Link from "next/link";

import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
      <p className="text-muted mt-2 text-sm">
        Join TalentScreen as a job seeker or an employer.
      </p>

      <div className="mt-8">
        <SignupForm />
      </div>

      <p className="text-muted mt-6 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
