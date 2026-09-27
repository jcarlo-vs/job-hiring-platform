-- ============================================================
-- TalentScreen schema on Neon Postgres.
--
-- Consolidated from the nine supabase/migrations files. There was no data to
-- carry over, so this is one file representing the final state rather than a
-- replayed history. Future changes get 0002_, 0003_, and so on.
--
-- What changed coming off Supabase, and why:
--
--   * auth.uid() is ours now. Supabase's version reads the `sub` claim from a
--     JWT its API layer verified. Ours reads a transaction-local setting the
--     app sets before every query. Keeping the NAME means all 14 policies and
--     every call site below are byte-identical to the originals; only the
--     function body changed.
--
--   * Two roles replace Supabase's anon/authenticated/service_role:
--       app_user      - RLS APPLIES (rolbypassrls = false). All user traffic.
--       neondb_owner  - RLS BYPASSED (rolbypassrls = true). Admin paths only,
--                       the direct equivalent of the service role.
--     This distinction is the whole security model. Connecting the app as the
--     owner would silently disable every policy below.
--
--   * profiles.id no longer references auth.users. It now holds the Cognito
--     `sub`, and the signup server action creates the row (the old
--     handle_new_user trigger fired on auth.users, which no longer exists).
--
--   * Storage policies are gone; resumes live in S3 and are authorized in app
--     code before a presigned URL is minted.
--
--   * The supabase_realtime publication is gone; the applicants board polls.
-- ============================================================

-- ---- RLS context -------------------------------------------
-- Kept in an `auth` schema named `auth.uid()` purely so the policies below did
-- not have to change. current_setting(..., true) returns NULL rather than
-- raising when the setting was never set, so an unauthenticated request gets
-- NULL and every `= auth.uid()` comparison is NULL, i.e. denies.
--
-- The app MUST set this with SET LOCAL inside a transaction, never plain SET.
-- SET LOCAL is transaction-scoped, so a pooled connection handed to the next
-- request cannot inherit the previous user's id. Verified against the pooler.
create schema if not exists auth;

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- ---- Enum types --------------------------------------------
create type public.user_role as enum ('APPLICANT', 'EMPLOYER');
create type public.employment_type as enum ('FULL_TIME', 'PART_TIME', 'CONTRACT');
create type public.work_mode as enum ('REMOTE', 'ONSITE', 'HYBRID');
create type public.job_status as enum ('OPEN', 'CLOSED');
create type public.application_stage as enum ('APPLIED', 'SCREENED', 'TECH_INTERVIEW', 'FINAL', 'OFFER', 'REJECTED');
create type public.screening_status as enum ('PENDING', 'PROCESSING', 'DONE', 'ERROR');
create type public.ai_recommendation as enum ('STRONG', 'MODERATE', 'WEAK');
create type public.salary_period as enum ('HOURLY', 'MONTHLY', 'ANNUAL');
create type public.job_category as enum (
  'SOFTWARE_ENGINEERING', 'DATA_AI', 'DESIGN', 'PRODUCT', 'MARKETING',
  'SALES', 'FINANCE_ACCOUNTING', 'OPERATIONS', 'CUSTOMER_SUPPORT',
  'HEALTHCARE', 'EDUCATION', 'ENGINEERING_TRADES', 'LEGAL',
  'WRITING_CONTENT', 'OTHER'
);

-- ---- profiles ----------------------------------------------
-- id is the Cognito `sub`. No foreign key: the identity provider is outside
-- this database now.
create table public.profiles (
  id uuid primary key,
  role public.user_role not null,
  full_name text,
  company_name text,
  phone text,
  resume_path text,
  resume_filename text,
  resume_uploaded_at timestamptz,
  preferred_categories public.job_category[] not null default '{}',
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---- jobs --------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  requirements text not null,
  location text,
  salary_min integer,
  salary_max integer,
  salary_period public.salary_period not null default 'ANNUAL',
  employment_type public.employment_type not null,
  work_mode public.work_mode not null,
  category public.job_category not null default 'OTHER',
  status public.job_status not null default 'OPEN',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint salary_range_valid check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  )
);

create index jobs_employer_id_idx on public.jobs (employer_id);
create index jobs_status_idx on public.jobs (status);
create index jobs_status_expires_at_idx on public.jobs (status, expires_at);
create index jobs_open_category_created_idx
  on public.jobs (category, created_at desc) where status = 'OPEN';
create index jobs_open_created_idx
  on public.jobs (created_at desc) where status = 'OPEN';

-- ---- applications ------------------------------------------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  resume_path text,
  stage public.application_stage not null default 'APPLIED',
  screening_status public.screening_status not null default 'PENDING',
  ai_score integer check (ai_score is null or (ai_score between 0 and 100)),
  ai_recommendation public.ai_recommendation,
  ai_summary text,
  ai_matched jsonb,
  ai_missing jsonb,
  ai_flags jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_unique_per_job_applicant unique (job_id, applicant_id)
);

create index applications_job_id_stage_idx on public.applications (job_id, stage);
create index applications_applicant_id_idx on public.applications (applicant_id);

-- ---- hiring email log --------------------------------------
-- RLS on, no policies, and no grants to app_user. Written and read only
-- through the owner connection, by server actions that verify employer
-- ownership in application code first.
create table public.application_emails (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  kind text not null,
  subject text not null,
  body text not null,
  sent_by uuid references public.profiles (id) on delete set null,
  sent_at timestamptz not null default now()
);

create index application_emails_application_id_idx
  on public.application_emails (application_id);

-- ---- health_check ------------------------------------------
create table public.health_check (
  id integer primary key,
  last_ping timestamptz not null default now()
);

insert into public.health_check (id) values (1);

-- ---- updated_at trigger ------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_set_updated_at
before update on public.applications
for each row
execute function public.set_updated_at();

-- ---- Enable RLS --------------------------------------------
-- No FORCE: the owner is meant to bypass these, which is how the admin paths
-- (screening worker, applicant-name reads) work. app_user does not bypass.
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_emails enable row level security;
alter table public.health_check enable row level security;

-- ---- private helpers ---------------------------------------
-- SECURITY DEFINER so a policy can read another RLS-protected table without
-- recursing into that table's own policies. They run as the owner, which
-- bypasses RLS, which is exactly the intent.
create schema if not exists private;

create or replace function private.owns_job(_job_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.jobs j
    where j.id = _job_id and j.employer_id = (select auth.uid())
  );
$$;

create or replace function private.is_employer()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'EMPLOYER'
  );
$$;

create or replace function private.has_application(_job_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.applications a
    where a.job_id = _job_id and a.applicant_id = (select auth.uid())
  );
$$;

-- ============================================================
-- Policies. Identical to the Supabase originals except that the grantee is
-- app_user instead of anon/authenticated: with no JWT layer, "anonymous" is
-- simply app.user_id being unset, which makes auth.uid() NULL.
-- ============================================================

-- ---- profiles ----------------------------------------------
create policy profiles_select_own on public.profiles
for select to app_user
using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
for update to app_user
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ---- jobs --------------------------------------------------
-- An applicant can still read a job they applied to after it closes or
-- expires, so their applications list can show the title.
create policy jobs_select_open_or_own on public.jobs
for select to app_user
using (
  status = 'OPEN'
  or employer_id = (select auth.uid())
  or private.has_application(id)
);

create policy jobs_insert_employer on public.jobs
for insert to app_user
with check (employer_id = (select auth.uid()) and private.is_employer());

create policy jobs_update_own on public.jobs
for update to app_user
using (employer_id = (select auth.uid()))
with check (employer_id = (select auth.uid()));

create policy jobs_delete_own on public.jobs
for delete to app_user
using (employer_id = (select auth.uid()));

-- ---- applications ------------------------------------------
create policy applications_select_applicant_or_employer on public.applications
for select to app_user
using (
  applicant_id = (select auth.uid())
  or private.owns_job(job_id)
);

-- Cannot apply to a CLOSED or EXPIRED job. This is the database enforcing it,
-- not the UI.
create policy applications_insert_own on public.applications
for insert to app_user
with check (
  applicant_id = (select auth.uid())
  and exists (
    select 1 from public.jobs j
    where j.id = job_id
      and j.status = 'OPEN'
      and (j.expires_at is null or j.expires_at > now())
  )
);

create policy applications_update_employer on public.applications
for update to app_user
using (private.owns_job(job_id))
with check (private.owns_job(job_id));

-- ---- health_check ------------------------------------------
create policy health_check_read on public.health_check
for select to app_user
using (true);

-- ============================================================
-- Grants. Supabase granted these to anon/authenticated implicitly; on Neon
-- they are explicit. Least privilege: app_user gets no access at all to
-- application_emails, which is an admin-only table.
-- ============================================================

grant usage on schema public to app_user;
grant usage on schema auth to app_user;
grant usage on schema private to app_user;

grant execute on function auth.uid() to app_user;
grant execute on function private.owns_job(uuid) to app_user;
grant execute on function private.is_employer() to app_user;
grant execute on function private.has_application(uuid) to app_user;

-- No INSERT on profiles: the row is created by the signup server action over
-- the owner connection, mirroring the old handle_new_user trigger, which was
-- SECURITY DEFINER and bypassed RLS for exactly this reason. Granting INSERT
-- here without a matching policy would just deny anyway.
grant select, update on public.profiles to app_user;
grant select, insert, update, delete on public.jobs to app_user;
grant select, insert, update on public.applications to app_user;
grant select on public.health_check to app_user;

-- Nothing on application_emails, on purpose.
