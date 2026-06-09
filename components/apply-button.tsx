"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { applyToJob } from "@/app/applications/actions";
import { uploadResume } from "@/lib/upload-resume";

const ERROR_MESSAGES: Record<string, string> = {
  already_applied: "You have already applied to this job.",
  unavailable: "This job is no longer accepting applications.",
  no_resume: "Please upload your CV first.",
};

export function ApplyButton({
  jobId,
  hasResume,
  resumeFilename,
}: {
  jobId: string;
  hasResume: boolean;
  resumeFilename: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [uploaded, setUploaded] = useState(hasResume);
  const [filename, setFilename] = useState<string | null>(resumeFilename);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    const res = await uploadResume(file);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setUploaded(true);
    setFilename(res.filename);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await applyToJob(jobId);
    setBusy(false);
    if (!res.ok) {
      setError(ERROR_MESSAGES[res.error] ?? res.error);
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <p className="form-note">
        Application received - screening in progress. Track it in{" "}
        <Link href="/applications" className="underline">
          My applications
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        Apply
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-background border-border w-full max-w-md rounded-lg border p-6">
            <h3 className="font-medium">Apply to this job</h3>

            {error && <p className="form-error mt-3">{error}</p>}

            {uploaded ? (
              <p className="text-muted mt-3 text-sm">
                Apply with your resume{filename ? `: ${filename}` : ""}.
              </p>
            ) : (
              <div className="mt-3">
                <p className="text-muted text-sm">
                  Please upload your CV first (PDF or Word, max 5 MB).
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={onFile}
                  disabled={busy}
                  className="field-input mt-3"
                />
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="text-muted self-center text-sm hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !uploaded}
                className="btn-primary"
              >
                {busy ? "Submitting..." : "Submit application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
