import Link from "next/link";
import { redirect } from "next/navigation";

import { getProfile } from "@/lib/auth";

export default async function DashboardPage() {
  const profile = await getProfile();

  // Middleware already gates this route; this is a defensive fallback.
  if (!profile) redirect("/login");

  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-muted text-sm">
        {profile.role === "EMPLOYER" ? "Employer dashboard" : "Your dashboard"}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">
        Welcome, {firstName}
      </h1>

      {profile.role === "EMPLOYER" ? (
        <section className="border-border mt-10 rounded-lg border p-8">
          <h2 className="font-medium">Your job postings</h2>
          <p className="text-muted mt-2 text-sm">
            You have not posted any jobs yet. Creating and managing job postings
            arrives in the next phase.
          </p>
          <span className="text-muted mt-4 inline-block text-sm">
            Post a job (coming soon)
          </span>
        </section>
      ) : (
        <section className="border-border mt-10 rounded-lg border p-8">
          <h2 className="font-medium">Your applications</h2>
          <p className="text-muted mt-2 text-sm">
            You have not applied to any jobs yet. Browsing jobs and applying
            arrives in the next phase.
          </p>
          <Link
            href="/"
            className="text-primary mt-4 inline-block text-sm hover:underline"
          >
            Back to home
          </Link>
        </section>
      )}
    </div>
  );
}
