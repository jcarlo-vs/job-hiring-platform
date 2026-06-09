-- ============================================================
-- Phase 0: private "resumes" storage bucket.
-- Per-bucket allowedMimeTypes + fileSizeLimit are the
-- authoritative, server-enforced upload validation.
-- Storage RLS policies (applicant upload / employer read) are
-- added in Phases 3 and 5 alongside the signed-URL flow.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880, -- 5 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;
