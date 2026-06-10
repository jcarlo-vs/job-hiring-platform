import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import { sendApplicationReceived } from "@/lib/inngest/email-functions";
import { screenApplication } from "@/lib/inngest/functions";

// Node runtime (the default for route handlers): the worker uses unpdf, mammoth,
// and the Anthropic SDK, which need Node APIs and are not Edge-compatible.
export const runtime = "nodejs";
// Give a single step (download + extract, or the Claude call) room to finish.
export const maxDuration = 60;

// In production, Inngest signs requests with INNGEST_SIGNING_KEY and the SDK
// verifies them, so this endpoint cannot be invoked by outside callers. The
// auth proxy leaves /api/inngest untouched (it is not a protected prefix).
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [screenApplication, sendApplicationReceived],
});
