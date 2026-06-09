import type { Database } from "@/lib/database.types";

export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationStage = Database["public"]["Enums"]["application_stage"];
export type ScreeningStatus = Database["public"]["Enums"]["screening_status"];

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
