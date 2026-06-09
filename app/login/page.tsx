import Link from "next/link";

import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted mt-2 text-sm">Welcome back to TalentScreen.</p>

      {error === "confirm" && (
        <p className="form-error mt-6">
          That confirmation link was invalid or expired. Please sign in or sign
          up again.
        </p>
      )}

      <div className="mt-8">
        <LoginForm />
      </div>

      <p className="text-muted mt-6 text-sm">
        No account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
