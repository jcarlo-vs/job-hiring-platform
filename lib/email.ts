import { Resend } from "resend";

import { STAGE_LABELS, type ApplicationStage } from "@/lib/applications";

// SERVER ONLY. Transactional email via Resend. No-ops with a warning when
// RESEND_API_KEY is unset (e.g. local dev without a key) so callers never crash.

const FROM = process.env.RESEND_FROM ?? "TalentScreen <onboarding@resend.dev>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://job-hiring-platform-eight.vercel.app";

let client: Resend | null = null;

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

/** Returns true if actually sent, false if skipped (no key configured). */
export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const r = resend();
  if (!r) {
    // Local dev without a key: log what *would* send so the wiring is observable
    // end-to-end. Real delivery needs RESEND_API_KEY (Phase 8).
    console.warn(
      `[email] no RESEND_API_KEY - would send "${args.subject}" to ${args.to}`,
    );
    return false;
  }
  const { error } = await r.emails.send({
    from: FROM,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? "unknown error"}`);
  }
  return true;
}

/** Minimal, inline-styled shell so it renders across email clients. */
function layout(heading: string, body: string, cta?: { label: string; href: string }) {
  const button = cta
    ? `<a href="${cta.href}" style="display:inline-block;background:#9b5de5;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:9999px;margin-top:8px">${cta.label}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#fffaf3;font-family:ui-rounded,'Segoe UI',system-ui,sans-serif;color:#2b2440">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <div style="font-weight:700;font-size:18px;margin-bottom:24px">Talent<span style="color:#9b5de5">Screen</span></div>
    <div style="background:#ffffff;border:2px solid #ece7f5;border-radius:16px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
      ${body}
      ${button}
    </div>
    <p style="color:#5b5470;font-size:12px;margin-top:20px">You are receiving this because you applied through TalentScreen.</p>
  </div></body></html>`;
}

export function applicationReceivedEmail(args: {
  name: string | null;
  jobTitle: string;
}): { subject: string; html: string } {
  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  return {
    subject: `We received your application for ${args.jobTitle}`,
    html: layout(
      "Application received",
      `<p style="margin:0 0 12px;line-height:1.6">${greeting}</p>
       <p style="margin:0 0 12px;line-height:1.6">Thanks for applying to <strong>${args.jobTitle}</strong>. Your application is in and AI screening is underway to help the hiring team review it. A person makes every final decision.</p>
       <p style="margin:0 0 16px;line-height:1.6">You can track its status anytime.</p>`,
      { label: "View my applications", href: `${SITE_URL}/applications` },
    ),
  };
}

export function stageChangeEmail(args: {
  name: string | null;
  jobTitle: string;
  stage: ApplicationStage;
}): { subject: string; html: string } {
  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  const stageLabel = STAGE_LABELS[args.stage];

  const message =
    args.stage === "REJECTED"
      ? `<p style="margin:0 0 12px;line-height:1.6">After review, the team has decided not to move forward with your application for <strong>${args.jobTitle}</strong> at this time. We appreciate the time you took to apply and wish you the best in your search.</p>`
      : args.stage === "OFFER"
        ? `<p style="margin:0 0 12px;line-height:1.6">Great news - your application for <strong>${args.jobTitle}</strong> has advanced to <strong>${stageLabel}</strong>. The team will be in touch with next steps.</p>`
        : `<p style="margin:0 0 12px;line-height:1.6">Your application for <strong>${args.jobTitle}</strong> has moved to <strong>${stageLabel}</strong>.</p>`;

  return {
    subject: `Update on your application for ${args.jobTitle}`,
    html: layout(
      "Application update",
      `<p style="margin:0 0 12px;line-height:1.6">${greeting}</p>${message}`,
      { label: "View my applications", href: `${SITE_URL}/applications` },
    ),
  };
}
