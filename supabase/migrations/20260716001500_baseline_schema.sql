-- The Colony Register: database schema
-- Run this in the Supabase SQL editor. It is written to be safe for a fresh
-- setup and to upgrade an earlier version of the schema in place.

-- ---------------------------------------------------------------------------
-- profiles: one row per account, linked 1:1 to a Supabase Auth user.
-- Villas use this for forced password change and resident onboarding.
-- Admin and superadmin accounts do not have residents of their own.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  villa_number text unique,
  username text unique,
  display_name text,
  role text not null default 'villa',
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists username text;
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists role text not null default 'villa';
alter table profiles add column if not exists must_change_password boolean not null default true;
alter table profiles alter column villa_number drop not null;

update profiles
set
  username = coalesce(username, villa_number),
  display_name = coalesce(
    display_name,
    case
      when villa_number is not null then replace(initcap(villa_number), 'Villa-', 'Villa ')
      else 'Resident account'
    end
  ),
  role = coalesce(role, 'villa')
where username is null or display_name is null or role is null;

create unique index if not exists profiles_username_idx on profiles (username);

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('villa', 'admin', 'superadmin'));

-- ---------------------------------------------------------------------------
-- residents: household members for a villa, added on first login. Used to
-- auto-fill the reporter name/phone when raising a ticket.
-- ---------------------------------------------------------------------------
create table if not exists residents (
  id bigint generated always as identity primary key,
  villa_number text not null references profiles (villa_number) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create index if not exists residents_villa_idx on residents (villa_number);

-- ---------------------------------------------------------------------------
-- issues: shared community log, readable by any signed-in account.
-- ---------------------------------------------------------------------------
create table if not exists issues (
  id bigint generated always as identity primary key,
  category text not null,
  urgency text not null check (urgency in ('emergency', 'high', 'medium', 'low')),
  description text not null,
  location text not null,
  reported_by_villa text,
  reporter_name text not null,
  reporter_phone text,
  issue_photo_urls jsonb not null default '[]'::jsonb,
  status text not null default 'open' check (status in ('open', 'assigned', 'resolved')),
  assigned_service_contact_id bigint,
  assigned_service_contact_name text,
  assigned_by text,
  assigned_at timestamptz,
  follow_up_count integer not null default 0,
  last_followed_up_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text,
  resolved_by text
);

alter table issues drop constraint if exists issues_category_check;
alter table issues add constraint issues_category_check
  check (category in ('plumbing', 'electrical', 'pest', 'general'));
alter table issues drop constraint if exists issues_status_check;
alter table issues add constraint issues_status_check
  check (status in ('open', 'assigned', 'resolved'));
alter table issues add column if not exists issue_photo_urls jsonb not null default '[]'::jsonb;
alter table issues add column if not exists assigned_service_contact_id bigint;
alter table issues add column if not exists assigned_service_contact_name text;
alter table issues add column if not exists assigned_by text;
alter table issues add column if not exists assigned_at timestamptz;
alter table issues add column if not exists follow_up_count integer not null default 0;
alter table issues add column if not exists last_followed_up_at timestamptz;

create index if not exists issues_status_idx on issues (status);
create index if not exists issues_created_at_idx on issues (created_at);
create index if not exists issues_assigned_contact_idx on issues (assigned_service_contact_id);

-- ---------------------------------------------------------------------------
-- issue_photos: metadata for issue photo files stored in Supabase Storage.
-- The legacy issues.issue_photo_urls jsonb column may still exist in some
-- projects; new uploads should use this table instead.
-- ---------------------------------------------------------------------------
create table if not exists issue_photos (
  id bigint generated always as identity primary key,
  issue_id bigint not null references issues (id) on delete cascade,
  full_path text,
  thumb_path text,
  full_deleted_at timestamptz,
  thumb_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table issue_photos add column if not exists issue_id bigint references issues (id) on delete cascade;
alter table issue_photos add column if not exists full_path text;
alter table issue_photos add column if not exists thumb_path text;
alter table issue_photos add column if not exists full_deleted_at timestamptz;
alter table issue_photos add column if not exists thumb_deleted_at timestamptz;
alter table issue_photos add column if not exists created_at timestamptz not null default now();

create index if not exists issue_photos_issue_id_idx on issue_photos (issue_id);
create index if not exists issue_photos_created_at_idx on issue_photos (created_at);

-- ---------------------------------------------------------------------------
-- issue_notifications: a secure audit trail of ticket notifications prepared
-- for WhatsApp delivery or follow-up.
-- ---------------------------------------------------------------------------
create table if not exists issue_notifications (
  id bigint generated always as identity primary key,
  issue_id bigint not null references issues (id) on delete cascade,
  event_type text not null,
  recipient_type text not null,
  recipient_label text not null,
  message text not null,
  ticket_url text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table issue_notifications add column if not exists issue_id bigint references issues (id) on delete cascade;
alter table issue_notifications add column if not exists event_type text;
alter table issue_notifications add column if not exists recipient_type text;
alter table issue_notifications add column if not exists recipient_label text;
alter table issue_notifications add column if not exists message text;
alter table issue_notifications add column if not exists ticket_url text;
alter table issue_notifications add column if not exists created_by uuid references auth.users (id) on delete set null;
alter table issue_notifications add column if not exists created_at timestamptz not null default now();

alter table issue_notifications drop constraint if exists issue_notifications_event_type_check;
alter table issue_notifications add constraint issue_notifications_event_type_check
  check (event_type in ('created', 'assigned', 'follow_up', 'resolved'));

create index if not exists issue_notifications_issue_id_idx on issue_notifications (issue_id, created_at desc);

-- ---------------------------------------------------------------------------
-- service_contacts: maintained by admin/superadmin, readable by all signed-in
-- users, and surfaced on the issue form.
-- ---------------------------------------------------------------------------
create table if not exists service_contacts (
  id bigint generated always as identity primary key,
  seed_key text unique not null,
  service text not null,
  role text not null,
  name text not null,
  phone_number text not null,
  photo_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table service_contacts add column if not exists seed_key text;
alter table service_contacts add column if not exists service text;
alter table service_contacts add column if not exists role text;
alter table service_contacts add column if not exists name text;
alter table service_contacts add column if not exists phone_number text;
alter table service_contacts add column if not exists photo_url text;
alter table service_contacts add column if not exists sort_order integer not null default 0;
alter table service_contacts add column if not exists created_at timestamptz not null default now();
alter table service_contacts add column if not exists updated_at timestamptz not null default now();

create unique index if not exists service_contacts_seed_key_idx on service_contacts (seed_key);
create index if not exists service_contacts_service_idx on service_contacts (service, sort_order);

alter table issues drop constraint if exists issues_assigned_service_contact_id_fkey;
alter table issues
  add constraint issues_assigned_service_contact_id_fkey
  foreign key (assigned_service_contact_id) references service_contacts (id) on delete set null;

-- ---------------------------------------------------------------------------
-- helper functions for RLS policies
-- ---------------------------------------------------------------------------
create or replace function current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function current_profile_villa()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select villa_number from profiles where id = auth.uid()
$$;

create or replace function current_profile_label()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(display_name, villa_number, username, 'Account')
  from profiles
  where id = auth.uid()
$$;

create or replace function can_update_issue(issue_reported_by_villa text)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    current_profile_role() in ('admin', 'superadmin')
$$;

create or replace function can_view_issue_photo(target_issue_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from issues
    where id = target_issue_id
      and (
        current_profile_role() in ('admin', 'superadmin')
        or reported_by_villa = current_profile_villa()
      )
  )
$$;

create or replace function touch_service_contact_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function clear_legacy_issue_photo_urls()
returns trigger
language plpgsql
as $$
begin
  new.issue_photo_urls = '[]'::jsonb;
  return new;
end;
$$;

create or replace function assign_issue(target_issue_id bigint, target_contact_id bigint)
returns issues
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  actor_role text := current_profile_role();
  actor_label text := current_profile_label();
  target_issue issues%rowtype;
  selected_contact service_contacts%rowtype;
  expected_service text;
  normalized_expected_service text;
  normalized_contact_service text;
  updated_issue issues%rowtype;
begin
  if actor_role not in ('admin', 'superadmin') then
    raise exception 'Only admins can assign a fixer';
  end if;

  select * into target_issue
  from issues
  where id = target_issue_id
    and status <> 'resolved';

  if target_issue.id is null then
    raise exception 'Issue not found or already resolved';
  end if;

  select * into selected_contact
  from service_contacts
  where id = target_contact_id;

  if selected_contact.id is null then
    raise exception 'Selected service contact was not found';
  end if;

  expected_service := case target_issue.category
    when 'plumbing' then 'Plumber'
    when 'electrical' then 'Electrician'
    when 'pest' then 'Snake Catcher'
    else null
  end;

  normalized_expected_service := lower(trim(regexp_replace(coalesce(expected_service, ''), '\s+', ' ', 'g')));
  normalized_contact_service := lower(trim(regexp_replace(coalesce(selected_contact.service, ''), '\s+', ' ', 'g')));

  if expected_service is not null
    and normalized_contact_service <> normalized_expected_service
    and position(normalized_expected_service in normalized_contact_service) <> 1
    and position(normalized_contact_service in normalized_expected_service) <> 1 then
    raise exception 'Selected contact does not match the issue type';
  end if;

  update issues
  set
    status = 'assigned',
    assigned_service_contact_id = selected_contact.id,
    assigned_service_contact_name = selected_contact.name,
    assigned_by = actor_label,
    assigned_at = now()
  where id = target_issue_id
  returning * into updated_issue;

  if updated_issue.id is null then
    raise exception 'Issue not found';
  end if;

  return updated_issue;
end;
$$;

create or replace function follow_up_issue(target_issue_id bigint)
returns issues
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  actor_role text := current_profile_role();
  actor_villa text := current_profile_villa();
  updated_issue issues%rowtype;
begin
  if actor_role not in ('admin', 'superadmin') then
    update issues
    set
      follow_up_count = coalesce(follow_up_count, 0) + 1,
      last_followed_up_at = now()
    where id = target_issue_id
      and reported_by_villa = actor_villa
      and status <> 'resolved'
    returning * into updated_issue;
  else
    update issues
    set
      follow_up_count = coalesce(follow_up_count, 0) + 1,
      last_followed_up_at = now()
    where id = target_issue_id
      and status <> 'resolved'
    returning * into updated_issue;
  end if;

  if updated_issue.id is null then
    raise exception 'Issue not found or cannot be followed up';
  end if;

  return updated_issue;
end;
$$;

create or replace function resolve_issue_workflow(target_issue_id bigint, resolution_note text default null, resolved_worker text default null)
returns issues
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  actor_role text := current_profile_role();
  actor_villa text := current_profile_villa();
  actor_label text := current_profile_label();
  updated_issue issues%rowtype;
begin
  if actor_role in ('admin', 'superadmin') then
    update issues
    set
      status = 'resolved',
      resolved_at = now(),
      resolution_notes = nullif(trim(coalesce(resolution_note, '')), ''),
      resolved_by = coalesce(nullif(trim(coalesce(resolved_worker, '')), ''), actor_label)
    where id = target_issue_id
    returning * into updated_issue;
  else
    update issues
    set
      status = 'resolved',
      resolved_at = now(),
      resolution_notes = nullif(trim(coalesce(resolution_note, '')), ''),
      resolved_by = coalesce(nullif(trim(coalesce(resolved_worker, '')), ''), actor_label)
    where id = target_issue_id
      and reported_by_villa = actor_villa
    returning * into updated_issue;
  end if;

  if updated_issue.id is null then
    raise exception 'Issue not found or cannot be resolved';
  end if;

  return updated_issue;
end;
$$;

create or replace function create_issue_notifications(target_issue_id bigint, target_event_type text, target_ticket_url text)
returns integer
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  actor_role text := current_profile_role();
  actor_villa text := current_profile_villa();
  actor_label text := current_profile_label();
  target_issue issues%rowtype;
  target_service text;
  created_rows integer := 0;
  notification_text text;
  contact_row record;
begin
  select * into target_issue
  from issues
  where id = target_issue_id;

  if target_issue.id is null then
    raise exception 'Issue not found';
  end if;

  if target_event_type not in ('created', 'assigned', 'follow_up', 'resolved') then
    raise exception 'Unsupported notification event type';
  end if;

  if target_event_type = 'created' and actor_role not in ('admin', 'superadmin') and target_issue.reported_by_villa <> actor_villa then
    raise exception 'You cannot create notifications for this ticket';
  end if;

  if target_event_type = 'assigned' and actor_role not in ('admin', 'superadmin') then
    raise exception 'Only admins can notify assignment';
  end if;

  if target_event_type = 'follow_up' and target_issue.reported_by_villa <> actor_villa and actor_role not in ('admin', 'superadmin') then
    raise exception 'Only the resident or admin can follow up';
  end if;

  if target_event_type = 'resolved' and actor_role not in ('admin', 'superadmin') and target_issue.reported_by_villa <> actor_villa then
    raise exception 'You cannot notify resolution for this ticket';
  end if;

  target_service := case target_issue.category
    when 'plumbing' then 'Plumber'
    when 'electrical' then 'Electrician'
    when 'pest' then 'Snake Catcher'
    else null
  end;

  notification_text := case target_event_type
    when 'created' then format(
      'New ticket %s.%sUrgency: %s.%sLocation: %s.%sReporter: %s.%sDetails: %s.%sOpen ticket: %s',
      lpad(target_issue.id::text, 4, '0'),
      E'\n',
      initcap(target_issue.urgency),
      E'\n',
      target_issue.location,
      E'\n',
      target_issue.reporter_name,
      E'\n',
      target_issue.description,
      E'\n',
      target_ticket_url
    )
    when 'assigned' then format(
      'Ticket %s has been assigned to %s.%sIssue type: %s.%sLocation: %s.%sOpen ticket: %s',
      lpad(target_issue.id::text, 4, '0'),
      coalesce(target_issue.assigned_service_contact_name, 'the selected fixer'),
      E'\n',
      initcap(target_issue.category),
      E'\n',
      target_issue.location,
      E'\n',
      target_ticket_url
    )
    when 'follow_up' then format(
      'Resident follow-up for ticket %s.%sIssue type: %s.%sLocation: %s.%sDetails: %s.%sOpen ticket: %s',
      lpad(target_issue.id::text, 4, '0'),
      E'\n',
      initcap(target_issue.category),
      E'\n',
      target_issue.location,
      E'\n',
      target_issue.description,
      E'\n',
      target_ticket_url
    )
    when 'resolved' then format(
      'Ticket %s has been resolved by %s.%sIssue type: %s.%sLocation: %s.%sOpen ticket: %s',
      lpad(target_issue.id::text, 4, '0'),
      coalesce(target_issue.resolved_by, actor_label),
      E'\n',
      initcap(target_issue.category),
      E'\n',
      target_issue.location,
      E'\n',
      target_ticket_url
    )
    else null
  end;

  if target_event_type in ('created', 'follow_up', 'resolved') then
    insert into issue_notifications (issue_id, event_type, recipient_type, recipient_label, message, ticket_url, created_by)
    values (target_issue_id, target_event_type, 'facility_manager', 'Facility Manager', notification_text, target_ticket_url, auth.uid());
    created_rows := created_rows + 1;
  end if;

  if target_event_type = 'assigned' then
    insert into issue_notifications (issue_id, event_type, recipient_type, recipient_label, message, ticket_url, created_by)
    values (target_issue_id, target_event_type, 'resident', target_issue.reporter_name, notification_text, target_ticket_url, auth.uid());
    created_rows := created_rows + 1;
  end if;

  if target_event_type in ('created', 'follow_up') and target_service is not null then
    for contact_row in
      select role, name
      from service_contacts
      where service = target_service
      order by sort_order asc, name asc
    loop
      insert into issue_notifications (issue_id, event_type, recipient_type, recipient_label, message, ticket_url, created_by)
      values (
        target_issue_id,
        target_event_type,
        'service_provider',
        concat_ws(' - ', contact_row.role, contact_row.name),
        notification_text,
        target_ticket_url,
        auth.uid()
      );
      created_rows := created_rows + 1;
    end loop;
  end if;

  if target_event_type = 'assigned' and target_issue.assigned_service_contact_name is not null then
    insert into issue_notifications (issue_id, event_type, recipient_type, recipient_label, message, ticket_url, created_by)
    values (
      target_issue_id,
      target_event_type,
      'assigned_fixer',
      target_issue.assigned_service_contact_name,
      notification_text,
      target_ticket_url,
      auth.uid()
    );
    created_rows := created_rows + 1;
  end if;

  return created_rows;
end;
$$;

create or replace function admin_clear_issues()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table issues restart identity;
end;
$$;

revoke all on function admin_clear_issues() from public;
revoke all on function admin_clear_issues() from anon;
revoke all on function admin_clear_issues() from authenticated;
grant execute on function admin_clear_issues() to service_role;

drop trigger if exists service_contacts_touch_updated_at on service_contacts;
create trigger service_contacts_touch_updated_at
before update on service_contacts
for each row execute function touch_service_contact_updated_at();

drop trigger if exists issues_clear_legacy_photo_urls on issues;
create trigger issues_clear_legacy_photo_urls
before insert or update on issues
for each row execute function clear_legacy_issue_photo_urls();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table residents enable row level security;
alter table issues enable row level security;
alter table issue_photos enable row level security;
alter table issue_notifications enable row level security;
alter table service_contacts enable row level security;

drop policy if exists "A villa can read its own profile" on profiles;
drop policy if exists "A villa can update its own profile" on profiles;
drop policy if exists "A villa can read its own residents" on residents;
drop policy if exists "A villa can add its own residents" on residents;
drop policy if exists "Any signed-in villa can read issues" on issues;
drop policy if exists "Any signed-in villa can raise an issue" on issues;
drop policy if exists "Any signed-in villa can update an issue (e.g. resolve it)" on issues;

drop policy if exists "A user can read their own profile" on profiles;
drop policy if exists "A user can update their own profile" on profiles;
drop policy if exists "Superadmin can read all profiles" on profiles;
drop policy if exists "A villa can read its own residents or superadmin can read all" on residents;
drop policy if exists "A villa can add its own residents" on residents;
drop policy if exists "Any signed-in account can read issues" on issues;
drop policy if exists "Any signed-in account can raise an issue" on issues;
drop policy if exists "Any signed-in account can update an issue" on issues;
drop policy if exists "Any signed-in account can read issue photos" on issue_photos;
drop policy if exists "Authorized users can read issue photos" on issue_photos;
drop policy if exists "Any signed-in account can add issue photos" on issue_photos;
drop policy if exists "A resident or admin can read issue notifications" on issue_notifications;
drop policy if exists "Any signed-in account can read service contacts" on service_contacts;
drop policy if exists "Admins can edit service contacts" on service_contacts;

create policy "A user can read their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Superadmin can read all profiles"
  on profiles for select
  using (current_profile_role() = 'superadmin');

create policy "A user can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "A villa can read its own residents or superadmin can read all"
  on residents for select
  using (
    current_profile_role() = 'superadmin'
    or villa_number = current_profile_villa()
  );

create policy "A villa can add its own residents"
  on residents for insert
  with check (
    current_profile_role() = 'villa'
    and villa_number = current_profile_villa()
  );

create policy "Any signed-in account can read issues"
  on issues for select
  using (auth.uid() is not null);

create policy "Any signed-in account can raise an issue"
  on issues for insert
  with check (auth.uid() is not null);

create policy "Any signed-in account can update an issue"
  on issues for update
  using (can_update_issue(reported_by_villa))
  with check (can_update_issue(reported_by_villa));

create policy "Authorized users can read issue photos"
  on issue_photos for select
  using (can_view_issue_photo(issue_id));

create policy "Any signed-in account can add issue photos"
  on issue_photos for insert
  with check (auth.uid() is not null);

create policy "A resident or admin can read issue notifications"
  on issue_notifications for select
  using (
    current_profile_role() in ('admin', 'superadmin')
    or exists (
      select 1
      from issues
      where issues.id = issue_notifications.issue_id
        and issues.reported_by_villa = current_profile_villa()
    )
  );

create policy "Any signed-in account can read service contacts"
  on service_contacts for select
  using (auth.uid() is not null);

create policy "Admins can edit service contacts"
  on service_contacts for all
  using (current_profile_role() in ('admin', 'superadmin'))
  with check (current_profile_role() in ('admin', 'superadmin'));

revoke select (reporter_phone, issue_photo_urls) on public.issues from public;
revoke select (reporter_phone, issue_photo_urls) on public.issues from anon;
revoke select (reporter_phone, issue_photo_urls) on public.issues from authenticated;

grant execute on function assign_issue(bigint, bigint) to authenticated;
grant execute on function follow_up_issue(bigint) to authenticated;
grant execute on function resolve_issue_workflow(bigint, text, text) to authenticated;
grant execute on function create_issue_notifications(bigint, text, text) to authenticated;

-- Enable realtime so the app updates live across everyone's phones
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'issues'
  ) then
    alter publication supabase_realtime add table issues;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for issue photos and thumbnails
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('issue-photos', 'issue-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public can view issue photos" on storage.objects;
drop policy if exists "Authenticated users can view issue photos" on storage.objects;
drop policy if exists "Authenticated users can upload issue photos" on storage.objects;
create policy "Authenticated users can upload issue photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'issue-photos');
