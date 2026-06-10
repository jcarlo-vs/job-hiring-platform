import Link from "next/link";
import { redirect } from "next/navigation";

import { updateJob } from "@/app/jobs/actions";
import { JobForm } from "@/app/jobs/job-form";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=/jobs/${id}/edit`);

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!job || job.employer_id !== profile.id) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-xl font-semibold">Cannot edit this job</h1>
        <p className="text-muted mt-2 text-sm">
          You can only edit your own job postings.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-block">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Edit job</h1>
      <div className="mt-8">
        <JobForm
          action={updateJob.bind(null, job.id)}
          defaults={{
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            location: job.location ?? undefined,
            salaryMin: job.salary_min?.toString(),
            salaryMax: job.salary_max?.toString(),
            salaryPeriod: job.salary_period,
            employmentType: job.employment_type,
            workMode: job.work_mode,
            category: job.category,
            expiresAt: job.expires_at ? job.expires_at.slice(0, 10) : undefined,
          }}
          submitLabel="Save changes"
          cancelHref={`/jobs/${job.id}`}
        />
      </div>
    </div>
  );
}
