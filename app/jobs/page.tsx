import Link from "next/link";

import { JobFilters } from "@/components/job-filters";
import { JobsMasterDetail } from "@/components/jobs-master-detail";
import { getProfile } from "@/lib/auth";
import { Constants } from "@/lib/database.types";
import { PAGE_SIZE, isValidCategory } from "@/lib/jobs";
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
  if (validCategory) {
    query = query.eq("category", validCategory);
  } else if (preApplied) {
    query = query.in("category", prefs);
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

  // Per-job apply-state for the panel CTA: the viewer's applied job ids among
  // this page's results (bounded by PAGE_SIZE). Guests skip the query.
  let appliedJobIds: string[] = [];
  if (profile && jobs && jobs.length > 0) {
    const { data: applied } = await supabase
      .from("applications")
      .select("job_id")
      .eq("applicant_id", profile.id)
      .in(
        "job_id",
        jobs.map((j) => j.id),
      );
    appliedJobIds = [...new Set((applied ?? []).map((a) => a.job_id))];
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

      {error ? (
        <p className="form-error mt-8">Could not load jobs. Please try again.</p>
      ) : !jobs || jobs.length === 0 ? (
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
