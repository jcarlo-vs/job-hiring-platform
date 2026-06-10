-- ============================================================
-- Phase 7 (added): employer company/project name + applicant phone on
-- profiles, captured at signup; plus a log of hiring emails sent per
-- application (powers the "sent" indicator on the candidate page).
-- ============================================================

alter table public.profiles
  add column company_name text,
  add column phone text;

-- Capture company_name + phone from signup metadata alongside role/full_name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception
    when others then
      v_role := 'APPLICANT';
  end;

  if v_role is null then
    v_role := 'APPLICANT';
  end if;

  insert into public.profiles (id, role, full_name, company_name, phone)
  values (
    new.id,
    v_role,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---- hiring email log ---------------------------------------
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

-- RLS on; no client policies. Written and read only via the service role in
-- server actions that verify employer ownership first (same pattern as the
-- service-role reads of applicant names).
alter table public.application_emails enable row level security;
