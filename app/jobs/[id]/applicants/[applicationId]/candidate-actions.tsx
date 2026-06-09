"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { rescreenApplication } from "@/app/applications/actions";
import {
  PIPELINE_STAGES,
  STAGE_LABELS,
  type ApplicationStage,
} from "@/lib/applications";

import { updateApplicationStage } from "../actions";

export function CandidateActions({
  jobId,
  applicationId,
  stage,
  canRescreen,
}: {
  jobId: string;
  applicationId: string;
  stage: ApplicationStage;
  canRescreen: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function move(next: ApplicationStage) {
    if (next === stage) return;
    setError(null);
    setNote(null);
    startTransition(async () => {
      const res = await updateApplicationStage(jobId, applicationId, next);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function rescreen() {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const res = await rescreenApplication(applicationId);
      if (res.ok) {
        setNote("Re-screening queued.");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="field-label" htmlFor="stage">
          Stage
        </label>
        <select
          id="stage"
          value={stage}
          disabled={pending}
          onChange={(e) => move(e.target.value as ApplicationStage)}
          className="field-input disabled:opacity-50"
        >
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {canRescreen && (
        <button
          type="button"
          onClick={rescreen}
          disabled={pending}
          className="border-border w-full rounded-full border-2 px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
        >
          {pending ? "Working..." : "Re-run AI screening"}
        </button>
      )}

      {error && <p className="form-error">{error}</p>}
      {note && <p className="form-note">{note}</p>}
    </div>
  );
}
