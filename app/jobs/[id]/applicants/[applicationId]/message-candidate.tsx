"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AiRecommendation } from "@/lib/applications";

import { sendCandidateEmail } from "../actions";

type Template = "ADVANCE" | "REJECT" | "CUSTOM";

const TEMPLATE_LABELS: Record<Template, string> = {
  ADVANCE: "Advance to interview",
  REJECT: "Reject",
  CUSTOM: "Custom",
};

function buildTemplate(
  t: Template,
  args: { name: string; company: string; position: string },
): { subject: string; body: string } {
  const { name, company, position } = args;
  if (t === "ADVANCE") {
    return {
      subject: `Good news about your application - ${position}`,
      body: `Hi ${name},\n\nThank you for applying for ${position} at ${company}. We're pleased to let you know you've passed our initial screening.\n\nOur HR team will reach out shortly to schedule a brief interview - please keep an eye on your phone for a call. We look forward to speaking with you.\n\nBest regards,\nThe ${company} Hiring Team`,
    };
  }
  if (t === "REJECT") {
    return {
      subject: `Update on your application - ${position}`,
      body: `Hi ${name},\n\nThank you for your interest in ${position} at ${company} and for the time you put into your application.\n\nAfter careful review, we've decided not to move forward at this time. We genuinely appreciate your effort and wish you the very best in your search.\n\nBest regards,\nThe ${company} Hiring Team`,
    };
  }
  return { subject: "", body: "" };
}

export function MessageCandidate({
  jobId,
  applicationId,
  applicantName,
  company,
  position,
  recommendation,
}: {
  jobId: string;
  applicationId: string;
  applicantName: string;
  company: string;
  position: string;
  recommendation: AiRecommendation | null;
}) {
  const router = useRouter();
  const defaultTemplate: Template =
    recommendation === "WEAK" ? "REJECT" : "ADVANCE";
  const seed = buildTemplate(defaultTemplate, {
    name: applicantName,
    company,
    position,
  });

  const [template, setTemplate] = useState<Template>(defaultTemplate);
  const [subject, setSubject] = useState(seed.subject);
  const [body, setBody] = useState(seed.body);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function applyTemplate(t: Template) {
    setTemplate(t);
    setError(null);
    setNote(null);
    if (t === "CUSTOM") return;
    const tpl = buildTemplate(t, {
      name: applicantName,
      company,
      position,
    });
    setSubject(tpl.subject);
    setBody(tpl.body);
  }

  async function send() {
    setError(null);
    setNote(null);
    setPending(true);
    const res = await sendCandidateEmail(
      jobId,
      applicationId,
      template,
      subject,
      body,
    );
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNote(
      res.delivered
        ? "Email sent."
        : "Logged - but not delivered (no Resend key configured yet).",
    );
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TEMPLATE_LABELS) as Template[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => applyTemplate(t)}
            className={`rounded-full border-2 px-3 py-1 text-xs font-semibold ${
              template === t
                ? "border-primary bg-primary/10"
                : "border-border text-muted"
            }`}
          >
            {TEMPLATE_LABELS[t]}
          </button>
        ))}
      </div>

      <div>
        <label className="field-label" htmlFor="email-subject">
          Subject
        </label>
        <input
          id="email-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="field-input"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="email-body">
          Message
        </label>
        <textarea
          id="email-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          className="field-input"
        />
      </div>

      <button
        type="button"
        onClick={send}
        disabled={pending}
        className="btn-primary w-full"
      >
        {pending ? "Sending..." : "Send email"}
      </button>

      {error && <p className="form-error">{error}</p>}
      {note && <p className="form-note">{note}</p>}
    </div>
  );
}
