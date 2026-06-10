-- ============================================================
-- Phase 7 (added): salary period on jobs (hourly / monthly / annual)
-- Lets employers post "$10/hr" vs "$120,000/yr". Existing rows default to
-- ANNUAL so the column is NOT NULL without backfill.
-- ============================================================

create type public.salary_period as enum ('HOURLY', 'MONTHLY', 'ANNUAL');

alter table public.jobs
  add column salary_period public.salary_period not null default 'ANNUAL';
