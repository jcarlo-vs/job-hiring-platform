# Project Progress

**Current phase:** Phase 6 implemented (typecheck/lint/build clean) → email real-send pending a Resend key → Phase 7 (stretch, optional)
**Live URL:** https://job-hiring-platform-eight.vercel.app
**Repo:** https://github.com/jcarlo-vs/job-hiring-platform
**Last updated:** 2026-06-10

## Phase 0 - Project setup & foundations
- [x] Initialize Next.js + TypeScript + Tailwind; set up ESLint/Prettier
- [x] Create a Supabase project; add URL + keys to env (.env and .env.example)
- [x] Wire up `@supabase/ssr` (server + client helpers)
- [x] Create profiles, jobs, applications tables (SQL migration)
- [x] Create the private `resumes` storage bucket
- [x] Add ANTHROPIC_API_KEY, Inngest keys, Resend key to env  <!-- env vars declared in .env.example + .env.local; real values filled in their phases (Anthropic→P4, Resend→P6, Inngest→Vercel integration P4) -->
- [x] Add a /api/health route that runs a trivial DB query
- [x] Deploy a "hello world" to Vercel; confirm Supabase connectivity in prod
- [x] Add a GitHub Actions cron (every few days) that curls /api/health to keep the free-tier Supabase project from pausing  <!-- run verified green: ping returned {ok:true,db:up} -->
- [x] App layout/shell

## Phase 1 - Auth & roles (with RLS)
- [x] Email/password auth (sign up, log in, log out, sessions) via Supabase Auth  <!-- verified end-to-end on prod Auth: signup returns a session (confirmation off), password login returns a token -->
- [x] On signup, create a profiles row with chosen role (Applicant vs Employer)  <!-- handle_new_user trigger verified: profiles auto-created with correct roles -->
- [x] Protected routes / middleware; redirect unauthenticated users  <!-- verified: /dashboard -> /login?next=, auth-page skip -->
- [x] Role-based landing (applicant home vs employer dashboard)  <!-- /dashboard branches on the (verified) profile role read -->
- [x] Write and test RLS policies for profiles, jobs, applications, and the resumes bucket  <!-- verified via role impersonation + real GoTrue tokens: read isolation + WITH CHECK write enforcement; advisors clean -->


## Phase 2 - Jobs (employer create/manage) + public browse
- [x] Employer: create job (title, description, requirements, location, salary, type, work mode)  <!-- + employer-set expiry (default 30 days); employer-insert RLS verified via real token -->
- [x] Employer: edit, close/reopen, list own jobs  <!-- dashboard lists active/expired/closed; edit + close/reopen actions -->
- [x] Public: browse all OPEN jobs (card list) + single job detail page  <!-- expired/closed hidden from board + detail (no content leak) -->
- [x] Search + filters (keyword, location, type, work mode, salary range)  <!-- GET form; ilike keyword across title/description/requirements; verified -->
- [x] Pagination (or infinite scroll)  <!-- page-based, 9 per page, exact count -->
- [x] Empty/loading/error states  <!-- empty state, loading.tsx skeleton, error.tsx boundary -->
- [x] (added) Job-post expiry: employer-set expires_at, hidden on expiry, "Expired" section on dashboard, apply blocked by RLS

## Phase 3 - Applications (applicant side)
- [x] Resume upload to the resumes bucket via signed upload URL; validate type (PDF/DOCX) and size  <!-- profile default resume; server signed upload URL (service role); bucket-enforced type/size -->
- [x] Apply to a job → create applications row (stage APPLIED, screening_status PENDING)  <!-- apply modal; resume snapshotted to resumes/{jobId}/{appId}.ext -->
- [x] Enforce one application per job per applicant  <!-- unique constraint; verified 23505 -->
- [x] "My applications" page: job title, date, current stage, screening status  <!-- /applications; reads applied-to job titles via has_application policy -->
- [x] Confirmation UI ("Application received - screening in progress")
- [x] (verified) signed-URL upload, apply+snapshot, RLS isolation via Node script using real client libs

## Phase 4 - AI screening pipeline (centerpiece)
- [x] Set up Inngest and a screening function  <!-- Inngest v4: lib/inngest/client.ts (client + typed `application/submitted` event via eventType/staticSchema), lib/inngest/functions.ts (screenApplication), served at app/api/inngest/route.ts -->
- [x] On apply, enqueue a screening job with the application_id  <!-- applyToJob sends application/submitted after the resume snapshot; best-effort (a queue outage must not fail the apply) -->
- [x] Worker: download resume from Supabase Storage → extract text (unpdf / mammoth)  <!-- lib/resume-extract.ts; service-role download; verified live on a real PDF -->
- [x] Worker: call Claude with job requirements + resume text; request JSON per the contract  <!-- lib/screening.ts; claude-haiku-4-5; structured output via output_config.format JSON schema -->
- [x] Parse + validate JSON; persist ai_score, ai_recommendation, ai_summary, ai_matched, ai_missing, ai_flags  <!-- defensive parse + score clamp 0-100; verified persisted end-to-end -->
- [x] Set screening_status to DONE (or ERROR) and stage to SCREENED on success  <!-- DONE on success; onFailure → ERROR; stage advances APPLIED → SCREENED only (never pulls a candidate back) -->
- [x] Idempotency: guard so a re-run doesn't double-process (check screening_status)  <!-- atomic DB claim PENDING|ERROR → PROCESSING; verified live: re-sending the event skipped, updated_at unchanged -->
- [x] Retries with backoff + a clear ERROR state surfaced in the UI  <!-- Inngest retries:3 (exponential backoff); ERROR shows on /applications via SCREENING_LABELS; employer-side surfacing lands in Phase 5 -->
- [x] Secure the trigger (shared secret / signature) so outsiders can't invoke the worker  <!-- Inngest request signing (INNGEST_SIGNING_KEY) in prod; /api/inngest is not a protected proxy prefix -->
- [x] Manual "re-screen" action for an employer  <!-- rescreenApplication server action (ownership-checked, resets to PENDING, re-enqueues); employer UI to call it lands in Phase 5 -->
- Verified end-to-end on 2026-06-10 via the real UI flow: apply → PDF extracted → Claude scored (25/WEAK, calibrated) → persisted DONE/SCREENED; idempotent re-send skipped cleanly.
- Deploy TODO (prod): set ANTHROPIC_API_KEY in Vercel + add the Inngest Vercel integration (injects INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY).

## Phase 5 - Employer dashboard & hiring pipeline
- [x] Dashboard listing the employer's jobs, each with applicant counts per stage  <!-- dashboard shows per-stage count pills + "Applicants (N)" link per job -->
- [x] Per-job applicant view: table with AI score + recommendation, sortable (recommended first), filterable by stage  <!-- /jobs/[id]/applicants; ApplicantsView (client) sorts recommended/score/recent, filters by stage -->
- [x] Candidate detail: resume preview via signed download URL + AI summary, matched/missing requirements, flags  <!-- /jobs/[id]/applicants/[applicationId]; PDF in iframe, other types via "open in new tab"; advisory-only note -->
- [x] Move a candidate between stages (Applied → Screened → Tech Interview → Final → Offer/Rejected)  <!-- inline <select> in table + detail; updateApplicationStage action -->
- [x] Drag-and-drop pipeline board (Kanban-style) operating on stage  <!-- @dnd-kit/core; Table/Board toggle; optimistic moves shared with the table; keyboard-accessible -->
- [x] Manual employer re-screen surfaced  <!-- re-screen button on candidate detail (rescreenApplication); ERROR screening state shown -->
- [x] RLS + server-side checks on every stage change and resume download  <!-- stage updates run under the employer session (applications_update_employer / owns_job); pages re-check job ownership; resume signed URLs issued by service role only after ownership check -->
- Verified end-to-end 2026-06-10: typecheck + lint + `next build` clean; unauthenticated /jobs/[id]/applicants[/...] redirect (307) via proxy; employer browsed applicants, sorted/filtered, moved stages, dragged on the board, previewed the resume, and re-screened - all confirmed in the browser.
- No new migration needed - Phase 1 RLS (applications_select/update via private.owns_job, resumes_select for employers) already covers it.

## Phase 6 - Notifications & polish
- [x] Transactional emails (Resend): application received + stage-change notifications  <!-- lib/email.ts (branded templates) + Inngest fns send-application-received (on application/submitted) and send-stage-change (on new application/stage-changed, emitted by updateApplicationStage; NOT on auto APPLIED->SCREENED). Registered + no-op without RESEND_API_KEY. Real send pending a key. -->
- [x] Consistent empty/loading/error states across the app  <!-- added root app/error.tsx catch-all; loading skeletons for /dashboard and /jobs/[id]/applicants subtree; empty states already present elsewhere -->
- [x] Responsive layout + basic accessibility pass (labels, focus, contrast)  <!-- focus-visible ring in @layer base for buttons/links/draggable cards; forms already have label+htmlFor; header/main/footer + html lang=en; responsive via mobile-first Tailwind -->
- [x] Landing page explaining the product  <!-- app/page.tsx: role-aware CTAs (guest/employer/applicant), How-it-works, value props, Playful Pop styling -->
- [x] README.md: architecture diagram, live link, setup steps, responsible-AI note  <!-- mermaid screening pipeline, env table, setup w/ Inngest dev server. Screenshots: placeholder note for docs/screenshots (user to capture from the live UI). -->
- Verified: typecheck + lint + `next build` clean; landing renders. Both email functions proven firing locally end-to-end (triggered application/submitted + application/stage-changed; each resolved the applicant email and rendered the correct subject, then logged "would send ... to <email>"). The only thing gated on a key is the literal Resend API call -> Phase 8. (onboarding@resend.dev only delivers to the Resend-account email until a domain is verified.)

## Phase 7 - Stretch (optional, pick 1-2)
- [ ] Auto re-screen all applicants when a job's requirements change
- [ ] Employer analytics: funnel/conversion per job
- [ ] Applicant: saved searches + email job alerts
- [ ] Realtime updates (Supabase Realtime) so the dashboard updates live as screenings finish
- [ ] Rate limiting on apply + screening endpoints
- [ ] Basic evals for the screening prompt (a small fixed set of resume/JD pairs with expected outcomes)

## Phase 8 - Production deployment & go-live (do LAST; all prod + registration work lives here)
Local dev needs NONE of this. The app runs fully locally - the Inngest dev server needs no account, and screening already works with the local ANTHROPIC_API_KEY. These items only make the live Vercel site fully functional.
- [ ] Register a free Inngest account; add the Inngest Vercel integration (auto-injects INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY and syncs functions on each deploy)
- [ ] Add ANTHROPIC_API_KEY to Vercel env (prod screening)
- [ ] Register Resend; verify a sending domain; set RESEND_API_KEY + RESEND_FROM in Vercel (prod email - note Resend has no local mode, so a key is required to actually send even from localhost)
- [ ] Set NEXT_PUBLIC_SITE_URL to the live URL (used for links in emails)
- [ ] Confirm Supabase URL/anon + SUPABASE_SERVICE_ROLE_KEY are set in Vercel env
- [ ] Deploy (push to main) + prod smoke test: signup -> post job -> apply -> screening runs (Inngest Cloud) -> employer sees the score -> move a stage -> email delivered
- [ ] (optional) Re-enable Supabase email confirmation now that Resend SMTP is wired (the /auth/confirm route already exists)
