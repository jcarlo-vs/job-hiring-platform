import Anthropic from "@anthropic-ai/sdk";

// SERVER ONLY - reads ANTHROPIC_API_KEY. Runs in the Inngest worker.

/**
 * Cheap, fast, and sufficient for structured scoring at portfolio volume
 * ($1/$5 per 1M). Chosen in DECISIONS.md; structured outputs are supported on
 * Haiku 4.5. Do not add `effort` (errors on Haiku) or thinking here.
 */
export const SCREENING_MODEL = "claude-haiku-4-5";

export type AiRecommendation = "STRONG" | "MODERATE" | "WEAK";

export type ScreeningResult = {
  /** Overall fit, integer 0-100 (clamped here to satisfy the DB check). */
  score: number;
  recommendation: AiRecommendation;
  summary: string;
  /** Requirements the candidate clearly meets. */
  matched: string[];
  /** Important requirements with no supporting evidence. */
  missing: string[];
  /** Concerns worth a human's attention; empty if none. */
  flags: string[];
};

export type ScreenInput = {
  jobTitle: string;
  jobDescription: string;
  requirements: string;
  resumeText: string;
};

// JSON schema for structured outputs. This guarantees a schema-valid response;
// parseScreening still validates defensively per DECISIONS.md. Note: structured
// outputs ignore numeric bounds, so the 0-100 range is enforced by clamping.
const SCREENING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: {
      type: "integer",
      description:
        "Overall fit for THIS role, 0-100. 0 = no relevant fit; 100 = exceptional match to the requirements. Be calibrated - most candidates land 30-70.",
    },
    recommendation: {
      type: "string",
      enum: ["STRONG", "MODERATE", "WEAK"],
      description:
        "STRONG = clearly worth interviewing; MODERATE = worth a closer look; WEAK = likely not a fit.",
    },
    summary: {
      type: "string",
      description:
        "2-3 sentence, neutral assessment for the hiring manager. Specific and free of fluff.",
    },
    matched: {
      type: "array",
      items: { type: "string" },
      description:
        "Specific requirements the candidate clearly meets, each grounded in resume evidence.",
    },
    missing: {
      type: "array",
      items: { type: "string" },
      description:
        "Important requirements with no supporting evidence in the resume.",
    },
    flags: {
      type: "array",
      items: { type: "string" },
      description:
        "Concerns worth a human's attention (unexplained gaps, very short tenures, inconsistencies). Empty array if none.",
    },
  },
  required: ["score", "recommendation", "summary", "matched", "missing", "flags"],
};

const SYSTEM_PROMPT = `You are an impartial technical recruiter assisting a hiring team. You compare ONE candidate's resume against ONE job's requirements and produce a structured, ADVISORY screening.

Principles:
- You are a decision-support tool, never the decision-maker. A human makes the final call. Never state or imply that the candidate should be hired or rejected.
- Judge only on relevance to the stated requirements and responsibilities. Ignore name, gender, age, nationality, marital status, photos, and school prestige. Do not reward or penalize any protected characteristic.
- Ground every claim in evidence from the resume. If the resume lacks evidence for a requirement, list it under "missing" rather than assuming it is met.
- Be calibrated: reserve STRONG and high scores for candidates who clearly meet most core requirements. Most candidates are MODERATE or WEAK.
- Keep the summary concise, specific, and professional.`;

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

/** Run one resume against one job's requirements; returns the parsed result. */
export async function screenResume(input: ScreenInput): Promise<ScreeningResult> {
  const userPrompt = [
    `JOB TITLE:\n${input.jobTitle}`,
    `JOB DESCRIPTION:\n${input.jobDescription}`,
    `REQUIREMENTS:\n${input.requirements}`,
    `CANDIDATE RESUME (extracted text):\n${input.resumeText}`,
  ].join("\n\n---\n\n");

  const message = await anthropic().messages.create({
    model: SCREENING_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    output_config: { format: { type: "json_schema", schema: SCREENING_SCHEMA } },
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  return parseScreening(text);
}

/** Defensive parse + clamp. Throws on anything we cannot safely persist. */
function parseScreening(raw: string): ScreeningResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Model did not return valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Model output was not an object.");
  }
  const o = parsed as Record<string, unknown>;

  const rawScore = Number(o.score);
  if (!Number.isFinite(rawScore)) {
    throw new Error("Model output missing a numeric score.");
  }
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const recommendation = o.recommendation;
  if (
    recommendation !== "STRONG" &&
    recommendation !== "MODERATE" &&
    recommendation !== "WEAK"
  ) {
    throw new Error("Model output had an invalid recommendation.");
  }

  const asStrings = (v: unknown): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      : [];

  return {
    score,
    recommendation,
    summary: typeof o.summary === "string" ? o.summary.trim() : "",
    matched: asStrings(o.matched),
    missing: asStrings(o.missing),
    flags: asStrings(o.flags),
  };
}
