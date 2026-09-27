import Link from "next/link";

import { JobFilters } from "@/components/job-filters";
import { JobsMasterDetail } from "@/components/jobs-master-detail";
import { getProfile } from "@/lib/auth";
import { Constants } from "@/lib/database.types";
import { asUser } from "@/lib/db";
import type { Database } from "@/lib/database.types";
import { PAGE_SIZE, isValidCategory } from "@/lib/jobs";

type Job = Database["public"]["Tables"]["jobs"]["Row"];

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
  const categoryRaw = sp["category"];
  const categoryAbsent = categoryRaw === undefined;
  const categoryParam =
    typeof categoryRaw === "string" ? categoryRaw.trim() : "";
  const page = Math.max(1, Number.parseInt(str(sp, "page") || "1", 10) || 1);

  // Viewer (request-cached). Drives the panel CTA and the personalized filter.
  const profile = await getProfile();
  const prefs =
    profile?.role === "APPLICANT" ? (profile.preferred_categories ?? []) : [];
  const validCategory = isValidCategory(categoryParam) ? categoryParam : null;
  // Pre-apply the applicant's interests only on a fresh visit (no category
  // param at all). Any explicit value - a blank "Any category" submit or the
  // "all" opt-out link - turns personalization off and shows everything, so
  // the dropdown never disagrees with the results and the opt-out stays sticky.
  const preApplied = !validCategory && categoryAbsent && prefs.length > 0;

  // Built as parameterised SQL rather than a query builder. RLS still applies
  // (jobs_select_open_or_own), so this cannot return a job the viewer may not
  // see even if a filter below were wrong.
  const where: string[] = [
    "status = 'OPEN'",
    "(expires_at is null or expires_at > now())",
  ];
  const params: unknown[] = [];
  const bind = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (q) {
    const like = `%${q}%`;
    where.push(
      `(title ilike ${bind(like)} or description ilike ${bind(like)} or requirements ilike ${bind(like)})`,
    );
  }
  if (location) where.push(`location ilike ${bind(`%${location}%`)}`);
  if (
    employmentType &&
    (Constants.public.Enums.employment_type as readonly string[]).includes(
      employmentType,
    )
  ) {
    where.push(`employment_type = ${bind(employmentType)}::public.employment_type`);
  }
  if (
    workMode &&
    (Constants.public.Enums.work_mode as readonly string[]).includes(workMode)
  ) {
    where.push(`work_mode = ${bind(workMode)}::public.work_mode`);
  }
  if (validCategory) {
    where.push(`category = ${bind(validCategory)}::public.job_category`);
  } else if (preApplied) {
    where.push(`category = any(${bind(prefs)}::public.job_category[])`);
  }
  const salaryMinNum = Number.parseInt(salaryMin, 10);
  if (Number.isFinite(salaryMinNum) && salaryMinNum > 0) {
    where.push(`salary_max >= ${bind(salaryMinNum)}`);
  }

  const clause = where.join(" and ");

  // One round trip for the page and its total, so paging stays consistent.
  const rows = await asUser((db) =>
    db.query<Job & { total_count: string }>(
      `select *, count(*) over() as total_count
         from public.jobs
        where ${clause}
        order by created_at desc
        limit ${bind(PAGE_SIZE)} offset ${bind((page - 1) * PAGE_SIZE)}`,
      params,
    ),
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const jobs: Job[] = rows.map(({ total_count, ...job }) => job as Job);
  const count = rows.length > 0 ? Number(rows[0].total_count) : 0;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Per-job apply-state for the panel CTA: the viewer's applied job ids among
  // this page's results (bounded by PAGE_SIZE). Guests skip the query.
  let appliedJobIds: string[] = [];
  if (profile && jobs.length > 0) {
    const applied = await asUser((db) =>
      db.query<{ job_id: string }>(
        `select job_id from public.applications
          where applicant_id = $1 and job_id = any($2::uuid[])`,
        [profile.id, jobs.map((j) => j.id)],
      ),
    );
    appliedJobIds = [...new Set(applied.map((a) => a.job_id))];
  }

  const viewer = {
    userId: profile?.id ?? null,
    viewerRole: profile?.role ?? null,
    hasResume: !!profile?.resume_path,
    resumeFilename: profile?.resume_filename ?? null,
  };

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (location) params.set("location", location);
    if (employmentType) params.set("employment_type", employmentType);
    if (workMode) params.set("work_mode", workMode);
    if (salaryMin) params.set("salary_min", salaryMin);
    if (!categoryAbsent) params.set("category", categoryParam);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/jobs?${qs}` : "/jobs";
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
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
          category={validCategory ?? ""}
        />
      </div>

      {preApplied && (
        <div className="border-border mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 bg-white p-4 text-sm">
          <span className="font-semibold">Showing roles in your interests.</span>
          <span className="flex gap-4">
            <Link
              href="/jobs?category=all"
              className="text-primary font-semibold hover:underline"
            >
              Show all jobs
            </Link>
            <Link
              href="/settings/preferences"
              className="text-muted hover:text-foreground font-semibold"
            >
              Edit interests
            </Link>
          </span>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="border-border text-muted mt-8 rounded-2xl border-2 border-dashed p-12 text-center text-sm">
          No jobs match your search. Try clearing the filters.
        </div>
      ) : (
        <JobsMasterDetail
          jobs={jobs}
          appliedJobIds={appliedJobIds}
          viewer={viewer}
          pagination={{
            page,
            totalPages,
            prevHref: page > 1 ? pageHref(page - 1) : null,
            nextHref: page < totalPages ? pageHref(page + 1) : null,
          }}
        />
      )}
    </div>
  );
}
