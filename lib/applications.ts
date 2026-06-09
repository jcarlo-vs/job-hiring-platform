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
