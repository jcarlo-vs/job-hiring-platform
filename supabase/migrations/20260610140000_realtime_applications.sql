-- ============================================================
-- Phase 7: realtime on applications, so the employer's applicant
-- list/board updates live as screenings finish or stages change.
-- postgres_changes respects RLS: subscribers only receive rows
-- their applications SELECT policy allows.
-- ============================================================

alter publication supabase_realtime add table public.applications;
