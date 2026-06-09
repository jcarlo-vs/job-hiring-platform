"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { getMyResumeUrl } from "@/app/applications/actions";
import { uploadResume } from "@/lib/upload-resume";

export function ResumeManager({
  filename,
  uploadedAt,
}: {
  filename: string | null;
  uploadedAt: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    router.refresh();
  }

  async function viewResume() {
    const res = await getMyResumeUrl();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    window.open(res.url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="border-border rounded-lg border p-6">
      <h2 className="font-medium">Your resume</h2>
      {filename ? (
        <p className="text-muted mt-2 text-sm">
          Current:{" "}
          <button
            type="button"
            onClick={viewResume}
            className="text-primary hover:underline"
          >
            {filename}
          </button>
          {uploadedAt
            ? ` (uploaded ${new Date(uploadedAt).toLocaleDateString()})`
            : ""}
        </p>
      ) : (
        <p className="text-muted mt-2 text-sm">
          No resume uploaded yet. Upload one so you can apply to jobs.
        </p>
      )}

      {error && <p className="form-error mt-3">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={onFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="btn-primary mt-4"
      >
        {busy ? "Uploading..." : filename ? "Replace resume" : "Upload resume"}
      </button>
    </section>
  );
}
