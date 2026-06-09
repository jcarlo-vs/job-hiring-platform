-- ============================================================
-- Phase 3: applicant profile resume + application-driven job reads
-- ============================================================

alter table public.profiles
  add column if not exists resume_path text,
  add column if not exists resume_filename text,
  add column if not exists resume_uploaded_at timestamptz;

-- Does the current user have an application to this job? SECURITY DEFINER so a
-- jobs policy can use it without recursing into applications RLS.
create or replace function private.has_application(_job_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.applications a
    where a.job_id = _job_id
      and a.applicant_id = (select auth.uid())
  );
$$;

-- An applicant can read a job they applied to even after it closes/expires, so
-- their applications list can show the title. The public browse query still
-- filters status = OPEN, so this does not expose closed jobs on the board.
drop policy if exists jobs_select_open_or_own on public.jobs;
create policy jobs_select_open_or_own on public.jobs
for select to anon, authenticated
using (
  status = 'OPEN'
  or employer_id = (select auth.uid())
  or private.has_application(id)
);
