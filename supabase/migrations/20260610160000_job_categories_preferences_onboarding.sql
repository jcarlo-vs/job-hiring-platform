-- ============================================================
-- Job categories, applicant interest preferences, and a one-time
-- onboarding flag.
--   * jobs.category - required going forward; legacy rows backfill
--     atomically to 'OTHER' (a real, browsable bucket, never NULL).
--   * profiles.preferred_categories - the applicant's chosen interests;
--     '{}' is the canonical "no preferences set" state.
--   * profiles.onboarded_at - gates the one-time interest modal; NULL
--     means "never asked" (independent of preferences, so Skip never
--     re-nags).
-- Partial-OPEN indexes keep the personalized, paginated, freshness-
-- ordered browse fast as posting counts grow.
-- ============================================================

create type public.job_category as enum (
  'SOFTWARE_ENGINEERING',
  'DATA_AI',
  'DESIGN',
  'PRODUCT',
  'MARKETING',
  'SALES',
  'FINANCE_ACCOUNTING',
  'OPERATIONS',
  'CUSTOMER_SUPPORT',
  'HEALTHCARE',
  'EDUCATION',
  'ENGINEERING_TRADES',
  'LEGAL',
  'WRITING_CONTENT',
  'OTHER'
);

alter table public.jobs
  add column category public.job_category not null default 'OTHER';

alter table public.profiles
  add column preferred_categories public.job_category[] not null default '{}';

alter table public.profiles
  add column onboarded_at timestamptz;

create index if not exists jobs_open_category_created_idx
  on public.jobs (category, created_at desc)
  where status = 'OPEN';

create index if not exists jobs_open_created_idx
  on public.jobs (created_at desc)
  where status = 'OPEN';
