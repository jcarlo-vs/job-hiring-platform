"use client";

import { useState } from "react";

import { closeJob } from "@/app/jobs/actions";

/** "Close" trigger that confirms in a themed modal before closing the job. */
export function CloseJobButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-primary cursor-pointer font-semibold hover:underline"
      >
        Close
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Close posting"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="border-border relative w-full max-w-sm rounded-2xl border-2 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">Close this posting?</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">
              Applicants will no longer see it on the job board or be able to
              apply. You can reopen it anytime within 30 days.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-border hover:border-primary cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <form action={closeJob.bind(null, jobId)}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-full bg-red-500 px-4 py-2 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  Close job
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
