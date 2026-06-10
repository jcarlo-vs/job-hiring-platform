"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { JobCard } from "@/components/job-card";
import { JobDetailPanel, type CtaState } from "@/components/job-detail-panel";
import { JobListCard } from "@/components/job-list-card";
import type { Job } from "@/lib/jobs";

type Viewer = {
  userId: string | null;
  viewerRole: string | null;
  hasResume: boolean;
  resumeFilename: string | null;
};

type Pagination = {
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
};

function ctaFor(job: Job, viewer: Viewer, applied: Set<string>): CtaState {
  if (!viewer.userId) return { kind: "guest" };
  if (job.employer_id === viewer.userId) return { kind: "owner" };
  if (applied.has(job.id)) return { kind: "applied" };
  if (viewer.viewerRole === "APPLICANT") {
    return {
      kind: "apply",
      hasResume: viewer.hasResume,
      resumeFilename: viewer.resumeFilename,
    };
  }
  return { kind: "not-applicant" };
}

export function JobsMasterDetail({
  jobs,
  appliedJobIds,
  viewer,
  pagination,
}: {
  jobs: Job[];
  appliedJobIds: string[];
  viewer: Viewer;
  pagination: Pagination;
}) {
  const appliedSet = useMemo(() => new Set(appliedJobIds), [appliedJobIds]);
  const firstId = jobs[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(firstId);

  // Re-snap selection when the result set changes (filter/page navigation) and
  // the current selection is gone. Adjust-state-during-render is React's
  // documented alternative to a setState-in-effect (no cascading renders).
  const [prevFirstId, setPrevFirstId] = useState<string | null>(firstId);
  if (firstId !== prevFirstId) {
    setPrevFirstId(firstId);
    if (!jobs.some((j) => j.id === selectedId)) {
      setSelectedId(firstId);
    }
  }

  // Synchronous fallback so there is never a one-frame empty panel.
  const selectedJob = jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null;

  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
    if (selectedJob) {
      document
        .getElementById(`job-opt-${selectedJob.id}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedJob]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (jobs.length === 0) return;
    const idx = jobs.findIndex((j) => j.id === selectedJob?.id);
    let next = idx;
    if (e.key === "ArrowDown") next = Math.min(jobs.length - 1, idx + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, idx - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = jobs.length - 1;
    else return;
    e.preventDefault();
    setSelectedId(jobs[next].id);
  }

  const cta = selectedJob ? ctaFor(selectedJob, viewer, appliedSet) : null;

  return (
    <div className="mt-8">
      {/* Mobile: existing card grid; tapping navigates to the full page. */}
      <div className="lg:hidden">
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
        <PaginationRow {...pagination} />
      </div>

      {/* Desktop: master-detail split, each column scrolls independently. */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <ul
            role="listbox"
            aria-label="Jobs"
            aria-activedescendant={
              selectedJob ? `job-opt-${selectedJob.id}` : undefined
            }
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="focus-visible:ring-primary/40 space-y-3 rounded-2xl outline-none focus-visible:ring-2"
          >
            {jobs.map((job) => (
              <li key={job.id}>
                <JobListCard
                  job={job}
                  selected={job.id === selectedJob?.id}
                  onSelect={setSelectedId}
                />
              </li>
            ))}
          </ul>
          <PaginationRow {...pagination} />
        </div>

        <aside
          ref={panelRef}
          className="border-border rounded-2xl border-2 bg-white p-6 lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto"
        >
          {selectedJob && cta ? (
            <JobDetailPanel job={selectedJob} cta={cta} />
          ) : null}
        </aside>
      </div>

      {/* Screen-reader announcement of the selected job. */}
      <div aria-live="polite" className="sr-only">
        {selectedJob ? `Showing ${selectedJob.title}` : ""}
      </div>
    </div>
  );
}

function PaginationRow({ page, totalPages, prevHref, nextHref }: Pagination) {
  if (totalPages <= 1) return null;
  return (
    <div className="text-muted mt-6 flex items-center justify-between text-sm">
      {prevHref ? (
        <Link href={prevHref} className="hover:text-foreground">
          &larr; Previous
        </Link>
      ) : (
        <span className="opacity-40">&larr; Previous</span>
      )}
      <span>
        Page {page} of {totalPages}
      </span>
      {nextHref ? (
        <Link href={nextHref} className="hover:text-foreground">
          Next &rarr;
        </Link>
      ) : (
        <span className="opacity-40">Next &rarr;</span>
      )}
    </div>
  );
}
