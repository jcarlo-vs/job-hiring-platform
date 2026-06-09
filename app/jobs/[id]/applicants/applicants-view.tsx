"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

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

export function ApplicantsView({
  jobId,
  applicants: initial,
}: {
  jobId: string;
  applicants: ApplicantRow[];
}) {
  // Local copy so table + board share one optimistic source of truth.
  const [applicants, setApplicants] = useState(initial);
  const [, startTransition] = useTransition();
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
              className="border-border flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 bg-white p-4"
            >
              <div className="min-w-[10rem] flex-1">
                <Link
                  href={`/jobs/${jobId}/applicants/${a.id}`}
                  className="font-semibold hover:underline"
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
                className="field-input w-auto py-1 text-sm disabled:opacity-50"
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
