import Link from "next/link";

import { JobCard } from "@/components/job-card";
import { JobFilters } from "@/components/job-filters";
import { Constants } from "@/lib/database.types";
import { PAGE_SIZE } from "@/lib/jobs";
import { createClient } from "@/utils/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

function str(sp: SearchParams, key: string): string {
  const v = sp[key];
  return typeof v === "string" ? v.trim() : "";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = str(sp, "q");
  const location = str(sp, "location");
  const employmentType = str(sp, "employment_type");
  const workMode = str(sp, "work_mode");
  const salaryMin = str(sp, "salary_min");
  const page = Math.max(1, Number.parseInt(str(sp, "page") || "1", 10) || 1);

  const supabase = await createClient();
  let query = supabase
    .from("jobs")
    .select("*", { count: "exact" })
    .eq("status", "OPEN")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    query = query.or(
      `title.ilike.%${safe}%,description.ilike.%${safe}%,requirements.ilike.%${safe}%`,
    );
  }
  if (location) query = query.ilike("location", `%${location}%`);
  if (
    employmentType &&
    (Constants.public.Enums.employment_type as readonly string[]).includes(
      employmentType,
    )
  ) {
    query = query.eq(
      "employment_type",
      employmentType as (typeof Constants.public.Enums.employment_type)[number],
    );
  }
  if (
    workMode &&
    (Constants.public.Enums.work_mode as readonly string[]).includes(workMode)
  ) {
    query = query.eq(
      "work_mode",
      workMode as (typeof Constants.public.Enums.work_mode)[number],
    );
  }
  const salaryMinNum = Number.parseInt(salaryMin, 10);
  if (Number.isFinite(salaryMinNum) && salaryMinNum > 0) {
    query = query.gte("salary_max", salaryMinNum);
  }

  const {
    data: jobs,
    count,
    error,
  } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    if (employmentType) params.set("employment_type", employmentType);
    if (workMode) params.set("work_mode", workMode);
    if (salaryMin) params.set("salary_min", salaryMin);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Browse jobs</h1>
      <p className="text-muted mt-1 text-sm">
        {total} open {total === 1 ? "role" : "roles"}
      </p>

      <div className="mt-6">
        <JobFilters
          q={q}
          location={location}
          employmentType={employmentType}
          workMode={workMode}
          salaryMin={salaryMin}
        />
      </div>

      {error ? (
        <p className="form-error mt-8">
          Could not load jobs. Please try again.
        </p>
      ) : !jobs || jobs.length === 0 ? (
        <div className="border-border text-muted mt-8 rounded-lg border border-dashed p-12 text-center text-sm">
          No jobs match your search. Try clearing the filters.
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="text-muted mt-8 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="hover:text-foreground"
                >
                  &larr; Previous
                </Link>
              ) : (
                <span className="opacity-40">&larr; Previous</span>
              )}
              <span>
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="hover:text-foreground"
                >
                  Next &rarr;
                </Link>
              ) : (
                <span className="opacity-40">Next &rarr;</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
