-- ============================================================
-- Phase 0: core schema for the AI-screening job portal
-- profiles / jobs / applications + enums, indexes, RLS, helpers
-- RLS is ENABLED here (deny-by-default). Policies + the signup
-- trigger are added in Phase 1.
-- ============================================================

-- ---- Enum types --------------------------------------------
create type public.user_role as enum ('APPLICANT', 'EMPLOYER');
create type public.employment_type as enum ('FULL_TIME', 'PART_TIME', 'CONTRACT');
create type public.work_mode as enum ('REMOTE', 'ONSITE', 'HYBRID');
create type public.job_status as enum ('OPEN', 'CLOSED');
create type public.application_stage as enum ('APPLIED', 'SCREENED', 'TECH_INTERVIEW', 'FINAL', 'OFFER', 'REJECTED');
create type public.screening_status as enum ('PENDING', 'PROCESSING', 'DONE', 'ERROR');
create type public.ai_recommendation as enum ('STRONG', 'MODERATE', 'WEAK');

-- ---- profiles ----------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text,
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
  employment_type public.employment_type not null,
  work_mode public.work_mode not null,
  status public.job_status not null default 'OPEN',
  created_at timestamptz not null default now(),
  constraint salary_range_valid check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  )
);

create index jobs_employer_id_idx on public.jobs (employer_id);
create index jobs_status_idx on public.jobs (status);

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

-- ---- Enable RLS (deny-by-default; policies land in Phase 1) -
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

-- ---- private schema + SECURITY DEFINER helper --------------
-- Used by RLS policies that must read another RLS-protected
-- table without triggering infinite recursion. Not exposed via
-- the API (PostgREST only exposes the `public` schema).
create schema if not exists private;

create or replace function private.owns_job(_job_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.jobs j
    where j.id = _job_id
      and j.employer_id = (select auth.uid())
  );
$$;

-- ---- health_check (keep-alive target) ----------------------
-- A single dummy row the /api/health route SELECTs so the cron
-- ping performs real DB activity (resets Supabase's pause timer).
create table public.health_check (
  id integer primary key,
  last_ping timestamptz not null default now()
);

insert into public.health_check (id) values (1);

alter table public.health_check enable row level security;

-- Allow the anon/publishable key to read the single dummy row so
-- the health route does not need the service-role key.
create policy health_check_read
on public.health_check
for select
to anon, authenticated
using (true);
