import type { AiRecommendation } from "../lib/screening";

/**
 * A small fixed set of resume/JD pairs with expected outcomes - a regression
 * guard for the screening prompt. Expectations are buckets/ranges (not exact
 * values) to tolerate normal model variance on clear-cut cases.
 *
 * Run with: npm run eval  (needs ANTHROPIC_API_KEY in .env.local)
 */
export type EvalCase = {
  name: string;
  jobTitle: string;
  jobDescription: string;
  requirements: string;
  resumeText: string;
  expect: {
    recommendationIn?: AiRecommendation[];
    minScore?: number;
    maxScore?: number;
  };
};

const BACKEND_JOB = {
  jobTitle: "Senior Backend Engineer",
  jobDescription:
    "Design and operate high-throughput payment APIs in Go on AWS, owning services end to end.",
  requirements:
    "5+ years backend; strong Go; PostgreSQL; AWS (ECS/Lambda); designed event-driven systems; payments or fintech a plus.",
};

export const cases: EvalCase[] = [
  {
    name: "Strong match - senior, on-stack",
    ...BACKEND_JOB,
    resumeText:
      "8 years backend engineering. Led Go payment-ledger services handling 5k req/s at a fintech. Deep PostgreSQL schema design and tuning. AWS ECS + Lambda in production. Designed and migrated to event-driven microservices (SQS/SNS).",
    expect: { recommendationIn: ["STRONG"], minScore: 70 },
  },
  {
    name: "Weak match - junior, wrong stack",
    ...BACKEND_JOB,
    resumeText:
      "About 1 year of experience building WordPress sites and small landing pages with HTML, CSS, and jQuery. No Go, no cloud experience, and no databases beyond basic MySQL queries.",
    expect: { recommendationIn: ["WEAK"], maxScore: 40 },
  },
  {
    name: "Moderate match - adjacent stack, senior",
    ...BACKEND_JOB,
    resumeText:
      "6 years backend in Java/Spring Boot. Strong PostgreSQL and AWS (ECS). Built REST APIs and Kafka-based event pipelines at scale. No production Go yet, but picks up languages quickly.",
    expect: { recommendationIn: ["MODERATE", "STRONG"], minScore: 45, maxScore: 88 },
  },
  {
    name: "Domain mismatch - frontend for a backend role",
    ...BACKEND_JOB,
    resumeText:
      "7 years frontend engineering. Expert in React, TypeScript, and CSS; built design systems and complex SPAs. Minimal backend work (a little Node for a backend-for-frontend). No Go, no cloud infrastructure.",
    expect: { recommendationIn: ["WEAK", "MODERATE"], maxScore: 55 },
  },
];
