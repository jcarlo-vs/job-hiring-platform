-- ============================================================
-- Phase 2: job-post expiry
-- ============================================================

alter table public.jobs
  add column if not exists expires_at timestamptz;

-- Helps the public-board filter (status OPEN + not expired).
create index if not exists jobs_status_expires_at_idx
  on public.jobs (status, expires_at);

-- Tighten the apply policy: cannot apply to a CLOSED or EXPIRED job.
drop policy if exists applications_insert_own on public.applications;
create policy applications_insert_own on public.applications
for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and exists (
    select 1 from public.jobs j
    where j.id = job_id
      and j.status = 'OPEN'
      and (j.expires_at is null or j.expires_at > now())
  )
);
