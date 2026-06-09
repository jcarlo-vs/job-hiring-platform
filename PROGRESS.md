# Project Progress

**Current phase:** Phase 1 ✅ complete → Phase 2 (not started)
**Live URL:** https://job-hiring-platform-eight.vercel.app
**Repo:** https://github.com/jcarlo-vs/job-hiring-platform
**Last updated:** 2026-06-09

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
- [ ] Employer: create job (title, description, requirements, location, salary, type, work mode)
- [ ] Employer: edit, close/reopen, list own jobs
- [ ] Public: browse all OPEN jobs (card list) + single job detail page
- [ ] Search + filters (keyword, location, type, work mode, salary range)
- [ ] Pagination (or infinite scroll)
- [ ] Empty/loading/error states

## Phase 3 - Applications (applicant side)
- [ ] Resume upload to the resumes bucket via signed upload URL; validate type (PDF/DOCX) and size
- [ ] Apply to a job → create applications row (stage APPLIED, screening_status PENDING)
- [ ] Enforce one application per job per applicant
- [ ] "My applications" page: job title, date, current stage, screening status
- [ ] Confirmation UI ("Application received - screening in progress")

## Phase 4 - AI screening pipeline (centerpiece)
- [ ] Set up Inngest and a screening function
- [ ] On apply, enqueue a screening job with the application_id
- [ ] Worker: download resume from Supabase Storage → extract text (pdf-parse / mammoth)
- [ ] Worker: call Claude with job requirements + resume text; request JSON per the contract
- [ ] Parse + validate JSON; persist ai_score, ai_recommendation, ai_summary, ai_matched, ai_missing, ai_flags
- [ ] Set screening_status to DONE (or ERROR) and stage to SCREENED on success
- [ ] Idempotency: guard so a re-run doesn't double-process (check screening_status)
- [ ] Retries with backoff + a clear ERROR state surfaced in the UI
- [ ] Secure the trigger (shared secret / signature) so outsiders can't invoke the worker
- [ ] Manual "re-screen" action for an employer

## Phase 5 - Employer dashboard & hiring pipeline
- [ ] Dashboard listing the employer's jobs, each with applicant counts per stage
- [ ] Per-job applicant view: table with AI score + recommendation, sortable (recommended first), filterable by stage
- [ ] Candidate detail: resume preview via signed download URL + AI summary, matched/missing requirements, flags
- [ ] Move a candidate between stages (Applied → Screened → Tech Interview → Final → Offer/Rejected)
- [ ] Drag-and-drop pipeline board (Kanban-style) operating on stage
- [ ] RLS + server-side checks on every stage change and resume download

## Phase 6 - Notifications & polish
- [ ] Transactional emails (Resend): application received + stage-change notifications
- [ ] Consistent empty/loading/error states across the app
- [ ] Responsive layout + basic accessibility pass (labels, focus, contrast)
- [ ] Landing page explaining the product
- [ ] README.md: architecture diagram, screenshots, live link, setup steps, and a note on the human-in-the-loop / responsible-AI design decision

## Phase 7 - Stretch (optional, pick 1-2)
- [ ] Auto re-screen all applicants when a job's requirements change
- [ ] Employer analytics: funnel/conversion per job
- [ ] Applicant: saved searches + email job alerts
- [ ] Realtime updates (Supabase Realtime) so the dashboard updates live as screenings finish
- [ ] Rate limiting on apply + screening endpoints
- [ ] Basic evals for the screening prompt (a small fixed set of resume/JD pairs with expected outcomes)
