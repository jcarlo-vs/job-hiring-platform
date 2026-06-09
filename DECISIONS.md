# Architectural Decisions

One line per decision, with the reason. Newest at the bottom.

## Phase 0
- 2026-06-09 — **Background jobs: Inngest** (over Supabase Edge Function + DB webhook) — retries, concurrency, idempotency, and an observability dashboard out of the box; deploys alongside Next.js on Vercel.
- 2026-06-09 — **Screening model: `claude-haiku-4-5`** — cheap/fast ($1/$5 per 1M) and sufficient for structured scoring at portfolio volume; user choice.
- 2026-06-09 — **AI output via structured outputs (`output_config.format` JSON schema)** rather than prompt-only "return-only-JSON" — guarantees schema-valid output; still parse defensively and set `screening_status=ERROR` on failure as a fallback.
- 2026-06-09 — **New Supabase project** (not reusing `freelancehub`/`node-tree`) — avoids schema/data collision with two unrelated paused projects; free-tier project cost is $0.
- 2026-06-09 — **Next.js 16 + App Router + Turbopack + React 19** via create-next-app recommended defaults — aligns with Vercel's own defaults (deploy target).
- 2026-06-09 — **Tailwind v4 (CSS-first)** — `@import "tailwindcss"` + `@theme` in `globals.css`, `@tailwindcss/postcss`; no `tailwind.config.js` (v4 auto-detects content).
- 2026-06-09 — **ESLint flat config (`eslint.config.mjs`) + Prettier** with `prettier-plugin-tailwindcss` for class sorting; `next lint` is removed in Next 16, lint runs via npm script.
- 2026-06-09 — **`@supabase/ssr` (not `@supabase/auth-helpers-nextjs`)** — auth-helpers is deprecated/archived; use the getAll/setAll cookie adapter and `getUser()` (never `getSession()`) for server-side authorization.
- 2026-06-09 — **Node 22 pinned** (`.nvmrc` + engines) — `unpdf`'s bundled PDF.js v5 needs Node ≥ 22; Next 16 needs ≥ 20.9.
- 2026-06-09 — **Resume extraction: `unpdf` (PDF) + `mammoth` (DOCX)** instead of `pdf-parse` v1 — avoids the v1 `module.parent` ENOENT import bug and the native `canvas` dependency; `unpdf` ships a serverless PDF.js build. Workers run on the Node runtime, not Edge.
- 2026-06-09 — **Postgres enum types** for role/employment_type/work_mode/job_status/application_stage/screening_status/ai_recommendation — clean type-safety and good generated TS types; values can be added later via `ALTER TYPE`.
- 2026-06-09 — **Resume storage: server-generated signed upload URLs** (service-role `createSignedUploadUrl` + client `uploadToSignedUrl`) with a **private** bucket; per-bucket `allowedMimeTypes`/`fileSizeLimit` are the authoritative validation; authorization done in server routes (signed-URL generation bypasses storage RLS). Path convention `resumes/{jobId}/{applicationId}.{ext}`.
- 2026-06-09 — **RLS cross-table checks via `SECURITY DEFINER` helpers in a private schema** (`set search_path = ''`) — avoids the infinite-recursion error when a policy queries another RLS-protected table.
- 2026-06-09 — **Keep-alive: GitHub Actions cron (2×/week) hitting `/api/health`** which runs a real DB query — a static 200 does not reset Supabase's pause timer; includes a keepalive-commit so GitHub doesn't disable the schedule after 60 days.
- 2026-06-09 — **Keep-alive workflow uses no third-party Actions** — this GitHub account blocks external (non-GitHub-owned) actions ("Repository access blocked"), so the `gautamkrishnar/keepalive-workflow` action was replaced with an inline implementation using only preinstalled `curl` + `gh`; the 60-day scheduled-workflow auto-disable is mitigated by an inline gh-API empty commit guarded on >50 days of inactivity.
- 2026-06-09 — **GitHub remote uses HTTPS + the gh credential helper (repo-local)** — the machine's SSH key authenticates as a different GitHub account (`jcvs-mosaic`); origin is set to HTTPS with `credential.https://github.com.helper=!gh auth git-credential` scoped to this repo so pushes use the `jcarlo-vs` gh token without touching global git config.
- 2026-06-09 — **Kanban DnD: `@dnd-kit/core` stable line** (over `@dnd-kit/react` 0.x pre-1.0 and Atlassian pragmatic-dnd) — best accessibility + sortable preset for React 19; (applies in Phase 5).
