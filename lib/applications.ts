import type { Database } from "@/lib/database.types";

export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationStage = Database["public"]["Enums"]["application_stage"];
export type ScreeningStatus = Database["public"]["Enums"]["screening_status"];
export type AiRecommendation = Database["public"]["Enums"]["ai_recommendation"];

/** Hiring pipeline order - used by the stage filter, board columns, and moves. */
export const PIPELINE_STAGES: ApplicationStage[] = [
  "APPLIED",
  "SCREENED",
  "TECH_INTERVIEW",
  "FINAL",
  "OFFER",
  "REJECTED",
];

export const RECOMMENDATION_LABELS: Record<AiRecommendation, string> = {
  STRONG: "Strong match",
  MODERATE: "Moderate match",
  WEAK: "Weak match",
};

/** Higher = stronger fit. Used to sort "recommended first". */
export const RECOMMENDATION_RANK: Record<AiRecommendation, number> = {
  STRONG: 3,
  MODERATE: 2,
  WEAK: 1,
};

/** Badge styling per recommendation (shared by the table + candidate detail). */
export const RECOMMENDATION_BADGE_CLASS: Record<AiRecommendation, string> = {
  STRONG: "border-green-300 bg-green-50 text-green-800",
  MODERATE: "border-amber-300 bg-amber-50 text-amber-800",
  WEAK: "border-red-300 bg-red-50 text-red-700",
};

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  APPLIED: "Applied",
  SCREENED: "Screened",
  TECH_INTERVIEW: "Tech interview",
  FINAL: "Final",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const SCREENING_LABELS: Record<ScreeningStatus, string> = {
  PENDING: "Screening pending",
  PROCESSING: "Screening in progress",
  DONE: "Screening done",
  ERROR: "Screening failed",
};

/* ---- Applicant-facing status (the "My applications" view) ----------------
 * Translates the internal stage + screening status into something an applicant
 * can track, WITHOUT leaking the raw score, the recommendation label, or the
 * gap checklist (which would invite resume-gaming). Strengths are surfaced only
 * for a genuine match, never fabricated for a weak one. */

export type ApplicantStatusTone = "pending" | "active" | "good" | "closed";

export type ApplicantStatus = {
  label: string;
  blurb: string;
  tone: ApplicantStatusTone;
  /** Index into APPLICANT_MILESTONES the applicant has reached; -1 = closed. */
  milestone: number;
  showStrengths: boolean;
};

export const APPLICANT_MILESTONES = [
  "Applied",
  "Screened",
  "Interview",
  "Offer",
] as const;

export function applicantStatus(
  stage: ApplicationStage,
  screening: ScreeningStatus,
  recommendation: AiRecommendation | null,
): ApplicantStatus {
  // Still being screened: applies whatever the stage, until results land.
  if (screening === "PENDING" || screening === "PROCESSING") {
    return {
      label: "Reviewing",
      blurb: "Your application is in and being reviewed. Check back shortly.",
      tone: "pending",
      milestone: 0,
      showStrengths: false,
    };
  }

  switch (stage) {
    case "REJECTED":
      return {
        label: "Closed",
        blurb:
          "The team has decided not to move forward this time. Thank you for taking the time to apply.",
        tone: "closed",
        milestone: -1,
        showStrengths: false,
      };
    case "TECH_INTERVIEW":
      return {
        label: "Interview",
        blurb:
          "Great news - the team wants to talk. Keep an eye on your email for details.",
        tone: "good",
        milestone: 2,
        showStrengths: false,
      };
    case "FINAL":
      return {
        label: "Final round",
        blurb: "You're in the final round. A decision should be close.",
        tone: "good",
        milestone: 2,
        showStrengths: false,
      };
    case "OFFER":
      return {
        label: "Offer",
        blurb: "Congratulations - the team is preparing an offer for you!",
        tone: "good",
        milestone: 3,
        showStrengths: false,
      };
    default: {
      // APPLIED (post-screen) or SCREENED: reviewed, now with the team. Show
      // strengths only for a real match; weak results get an honest, kind note.
      const matched =
        recommendation === "STRONG" || recommendation === "MODERATE";
      return {
        label: "Screened",
        tone: "active",
        milestone: 1,
        showStrengths: matched,
        blurb: matched
          ? "Your application has been reviewed and is with the hiring team."
          : "Your application has been reviewed. The team is prioritizing candidates who most closely match the core requirements.",
      };
    }
  }
}
