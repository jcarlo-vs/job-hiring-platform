-- ============================================================
-- Phase 1: auth profile trigger + RLS policies
-- ============================================================

-- ---- Auto-create a profile row on signup -------------------
-- Reads role + full_name from the signup metadata (options.data).
-- SECURITY DEFINER so it bypasses RLS to write the profile.
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

  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    v_role,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- handle_new_user is a trigger function only; it must not be callable via
-- PostgREST RPC. Revoke EXECUTE from API roles (the trigger still fires).
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- ---- Role helper (no recursion; bypasses profiles RLS) -----
create or replace function private.is_employer()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'EMPLOYER'
  );
$$;

-- ---- profiles policies -------------------------------------
create policy profiles_select_own on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- ---- jobs policies -----------------------------------------
create policy jobs_select_open_or_own on public.jobs
for select to anon, authenticated
using (status = 'OPEN' or employer_id = (select auth.uid()));

create policy jobs_insert_employer on public.jobs
for insert to authenticated
with check (employer_id = (select auth.uid()) and private.is_employer());

create policy jobs_update_own on public.jobs
for update to authenticated
using (employer_id = (select auth.uid()))
with check (employer_id = (select auth.uid()));

create policy jobs_delete_own on public.jobs
for delete to authenticated
using (employer_id = (select auth.uid()));

-- ---- applications policies ---------------------------------
create policy applications_select_applicant_or_employer on public.applications
for select to authenticated
using (
  applicant_id = (select auth.uid())
  or private.owns_job(job_id)
);

create policy applications_insert_own on public.applications
for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and exists (
    select 1 from public.jobs j
    where j.id = job_id and j.status = 'OPEN'
  )
);

create policy applications_update_employer on public.applications
for update to authenticated
using (private.owns_job(job_id))
with check (private.owns_job(job_id));

-- ---- storage: resumes bucket policies ----------------------
-- Path convention: resumes/{jobId}/{applicationId}.{ext}
-- foldername(name)[1] = jobId, filename(name) = {applicationId}.{ext}
create policy resumes_insert_applicant on storage.objects
for insert to authenticated
with check (
  bucket_id = 'resumes'
  and exists (
    select 1 from public.applications a
    where a.job_id::text = (storage.foldername(name))[1]
      and a.id::text = split_part(storage.filename(name), '.', 1)
      and a.applicant_id = (select auth.uid())
  )
);

create policy resumes_select_applicant_or_employer on storage.objects
for select to authenticated
using (
  bucket_id = 'resumes'
  and (
    exists (
      select 1 from public.applications a
      where a.job_id::text = (storage.foldername(name))[1]
        and a.id::text = split_part(storage.filename(name), '.', 1)
        and a.applicant_id = (select auth.uid())
    )
    or private.owns_job(((storage.foldername(name))[1])::uuid)
  )
);
