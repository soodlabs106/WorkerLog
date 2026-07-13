-- EM2 Resolve security hardening patch
-- Apply this in the Supabase SQL editor for the existing production project.

create or replace function public.can_update_issue(issue_reported_by_villa text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    public.current_profile_role() in ('admin', 'superadmin')
    or issue_reported_by_villa = public.current_profile_villa()
$$;

create or replace function public.can_view_issue_photo(target_issue_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.issues
    where id = target_issue_id
      and (
        public.current_profile_role() in ('admin', 'superadmin')
        or reported_by_villa = public.current_profile_villa()
      )
  )
$$;

create or replace function public.clear_legacy_issue_photo_urls()
returns trigger
language plpgsql
as $$
begin
  new.issue_photo_urls = '[]'::jsonb;
  return new;
end;
$$;

alter table public.issues enable row level security;
alter table public.issue_photos enable row level security;

drop policy if exists "Any signed-in account can update an issue" on public.issues;
create policy "Any signed-in account can update an issue"
  on public.issues for update
  using (public.can_update_issue(reported_by_villa))
  with check (public.can_update_issue(reported_by_villa));

drop policy if exists "Any signed-in account can read issue photos" on public.issue_photos;
drop policy if exists "Authorized users can read issue photos" on public.issue_photos;
create policy "Authorized users can read issue photos"
  on public.issue_photos for select
  using (public.can_view_issue_photo(issue_id));

drop trigger if exists issues_clear_legacy_photo_urls on public.issues;
create trigger issues_clear_legacy_photo_urls
before insert or update on public.issues
for each row execute function public.clear_legacy_issue_photo_urls();

revoke select (reporter_phone, issue_photo_urls) on public.issues from public;
revoke select (reporter_phone, issue_photo_urls) on public.issues from anon;
revoke select (reporter_phone, issue_photo_urls) on public.issues from authenticated;

update storage.buckets
set public = false
where id = 'issue-photos';

drop policy if exists "Public can view issue photos" on storage.objects;
drop policy if exists "Authenticated users can view issue photos" on storage.objects;

drop policy if exists "Authenticated users can upload issue photos" on storage.objects;
create policy "Authenticated users can upload issue photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'issue-photos');
