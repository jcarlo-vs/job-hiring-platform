import Link from "next/link";
import { redirect } from "next/navigation";

import { createJob } from "@/app/jobs/actions";
import { JobForm } from "@/app/jobs/job-form";
import { getProfile } from "@/lib/auth";
import { dateInputValue } from "@/lib/jobs";

export default async function NewJobPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/jobs/new");

  if (profile.role !== "EMPLOYER") {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">Employers only</h1>
        <p className="text-muted mt-2 text-sm">
          Only employer accounts can post jobs.
        </p>
        <Link href="/jobs" className="btn-primary mt-6 inline-block">
          Browse jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Post a job</h1>
      <p className="text-muted mt-1 text-sm">
        Applicants will see this on the job board until it expires.
      </p>
      <div className="mt-8">
        <JobForm
          action={createJob}
          defaults={{ expiresAt: dateInputValue(30) }}
          submitLabel="Post job"
        />
      </div>
    </div>
  );
}
