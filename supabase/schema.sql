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
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text,
  resolved_by text
);

alter table issues drop constraint if exists issues_category_check;
alter table issues add constraint issues_category_check
  check (category in ('plumbing', 'electrical', 'pest', 'general'));
alter table issues add column if not exists issue_photo_urls jsonb not null default '[]'::jsonb;

create index if not exists issues_status_idx on issues (status);
create index if not exists issues_created_at_idx on issues (created_at);

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

create or replace function touch_service_contact_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
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

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table residents enable row level security;
alter table issues enable row level security;
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
  using (auth.uid() is not null);

create policy "Any signed-in account can read service contacts"
  on service_contacts for select
  using (auth.uid() is not null);

create policy "Admins can edit service contacts"
  on service_contacts for all
  using (current_profile_role() in ('admin', 'superadmin'))
  with check (current_profile_role() in ('admin', 'superadmin'));

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
