"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import {
  PIPELINE_STAGES,
  RECOMMENDATION_BADGE_CLASS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_RANK,
  SCREENING_LABELS,
  STAGE_LABELS,
  type AiRecommendation,
  type ApplicationStage,
  type ScreeningStatus,
} from "@/lib/applications";

import { createClient } from "@/utils/supabase/client";

import { updateApplicationStage } from "./actions";
import { PipelineBoard } from "./pipeline-board";

export type ApplicantRow = {
  id: string;
  applicantName: string;
  appliedAt: string;
  stage: ApplicationStage;
  screeningStatus: ScreeningStatus;
  aiScore: number | null;
  aiRecommendation: AiRecommendation | null;
};

type SortKey = "recommended" | "score" | "recent";
type View = "table" | "board";

const SORT_LABELS: Record<SortKey, string> = {
  recommended: "Recommended first",
  score: "Highest score",
  recent: "Most recent",
};

// Forward progression for the funnel; REJECTED is an exit, counted separately.
const FUNNEL_STAGES: ApplicationStage[] = [
  "APPLIED",
  "SCREENED",
  "TECH_INTERVIEW",
  "FINAL",
  "OFFER",
];

/** Per-job funnel: how many applicants reached each stage, with conversion %. */
function JobFunnel({ applicants }: { applicants: ApplicantRow[] }) {
  const total = applicants.length;
  if (total === 0) return null;
  const rejected = applicants.filter((a) => a.stage === "REJECTED").length;
  // reached[i] = applicants currently at or beyond progression stage i.
  const reached = FUNNEL_STAGES.map((_, i) =>
    applicants.filter((a) => {
      const idx = FUNNEL_STAGES.indexOf(a.stage);
      return idx !== -1 && idx >= i;
    }).length,
  );

  return (
    <div className="border-border mb-6 rounded-2xl border-2 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Pipeline funnel</h2>
        {rejected > 0 && (
          <span className="text-muted text-xs">{rejected} rejected</span>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {FUNNEL_STAGES.map((stage, i) => {
          const count = reached[i];
          const pct = Math.round((count / total) * 100);
          return (
            <div key={stage}>
              <div className="text-muted flex justify-between text-xs">
                <span>{STAGE_LABELS[stage]}</span>
                <span className="tabular-nums">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="bg-border mt-0.5 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ApplicantsView({
  jobId,
  applicants: initial,
}: {
  jobId: string;
  applicants: ApplicantRow[];
}) {
  const router = useRouter();
  // Local copy so table + board share one optimistic source of truth.
  const [applicants, setApplicants] = useState(initial);
  // Adopt fresh server data after a router.refresh() (React's documented
  // adjust-state-when-props-change pattern; runs during render, not an effect).
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setApplicants(initial);
  }
  const [, startTransition] = useTransition();

  // Live updates: merge screening results / stage changes as they land in the
  // DB (Supabase Realtime; RLS scopes events to rows this employer can read).
  // New applications need a server read for the name, so they full-refresh.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`applications-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            stage: ApplicationStage;
            screening_status: ScreeningStatus;
            ai_score: number | null;
            ai_recommendation: AiRecommendation | null;
          };
          setApplicants((cur) =>
            cur.map((a) =>
              a.id === row.id
                ? {
                    ...a,
                    stage: row.stage,
                    screeningStatus: row.screening_status,
                    aiScore: row.ai_score,
                    aiRecommendation: row.ai_recommendation,
                  }
                : a,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "applications",
          filter: `job_id=eq.${jobId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, router]);
  const [view, setView] = useState<View>("table");
  const [stageFilter, setStageFilter] = useState<ApplicationStage | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("recommended");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function move(id: string, next: ApplicationStage) {
    const prev = applicants.find((a) => a.id === id)?.stage;
    if (!prev || prev === next) return;
    // Optimistic: update immediately, revert if the server rejects.
    setApplicants((cur) =>
      cur.map((a) => (a.id === id ? { ...a, stage: next } : a)),
    );
    setSavingId(id);
    setError(null);
    startTransition(async () => {
      const res = await updateApplicationStage(jobId, id, next);
      setSavingId(null);
      if (!res.ok) {
        setApplicants((cur) =>
          cur.map((a) => (a.id === id ? { ...a, stage: prev } : a)),
        );
        setError(res.error);
      }
    });
  }

  const visible = applicants
    .filter((a) => stageFilter === "ALL" || a.stage === stageFilter)
    .sort((a, b) => {
      if (sort === "recent") return b.appliedAt.localeCompare(a.appliedAt);
      const sa = a.aiScore ?? -1;
      const sb = b.aiScore ?? -1;
      if (sort === "score") return sb - sa;
      const ra = a.aiRecommendation ? RECOMMENDATION_RANK[a.aiRecommendation] : 0;
      const rb = b.aiRecommendation ? RECOMMENDATION_RANK[b.aiRecommendation] : 0;
      return rb - ra || sb - sa;
    });

  return (
    <div className="mt-6">
      <JobFunnel applicants={applicants} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="border-border inline-flex rounded-full border-2 p-0.5 text-sm">
          {(["table", "board"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-full px-3 py-1 font-semibold capitalize ${
                view === v ? "bg-primary text-primary-foreground" : "text-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {view === "table" && (
          <>
            <label className="text-muted text-sm">
              Stage{" "}
              <select
                value={stageFilter}
                onChange={(e) =>
                  setStageFilter(e.target.value as ApplicationStage | "ALL")
                }
                className="field-input ml-1 inline-block w-auto py-1"
              >
                <option value="ALL">All</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted text-sm">
              Sort{" "}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="field-input ml-1 inline-block w-auto py-1"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <option key={k} value={k}>
                    {SORT_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {error && <p className="form-error mt-3">{error}</p>}

      {view === "board" ? (
        <PipelineBoard
          jobId={jobId}
          applicants={applicants}
          onMove={move}
          busy={savingId !== null}
        />
      ) : visible.length === 0 ? (
        <div className="border-border text-muted mt-6 rounded-lg border border-dashed p-12 text-center text-sm">
          No applicants in this view.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((a) => (
            <li
              key={a.id}
              className="border-border hover:border-primary relative flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 bg-white p-4 transition-colors"
            >
              <div className="min-w-[10rem] flex-1">
                <Link
                  href={`/jobs/${jobId}/applicants/${a.id}`}
                  className="font-semibold hover:underline after:absolute after:inset-0"
                >
                  {a.applicantName}
                </Link>
                <p className="text-muted mt-0.5 text-xs">
                  {SCREENING_LABELS[a.screeningStatus]}
                </p>
              </div>

              <div className="w-28 text-sm">
                {a.aiRecommendation ? (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${RECOMMENDATION_BADGE_CLASS[a.aiRecommendation]}`}
                  >
                    {RECOMMENDATION_LABELS[a.aiRecommendation]}
                  </span>
                ) : (
                  <span className="text-muted text-xs">Not screened</span>
                )}
              </div>

              <div className="w-12 text-right text-sm font-semibold tabular-nums">
                {a.aiScore ?? "-"}
              </div>

              <select
                value={a.stage}
                disabled={savingId === a.id}
                onChange={(e) => move(a.id, e.target.value as ApplicationStage)}
                className="field-input relative z-10 w-auto py-1 text-sm disabled:opacity-50"
                aria-label={`Stage for ${a.applicantName}`}
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
