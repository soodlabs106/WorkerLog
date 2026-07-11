-- The Colony Register: database schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query),
-- BEFORE running scripts/seed-users.mjs.

-- ---------------------------------------------------------------------------
-- profiles: one row per villa, linked 1:1 to a Supabase Auth user created by
-- scripts/seed-users.mjs. Tracks whether the villa still needs to change its
-- default password.
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  villa_number text not null unique,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

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
-- issues
-- ---------------------------------------------------------------------------
create table if not exists issues (
  id bigint generated always as identity primary key,
  category text not null check (category in ('plumbing', 'electrical', 'pest', 'carpentry', 'general')),
  urgency text not null check (urgency in ('emergency', 'high', 'medium', 'low')),
  description text not null,
  location text not null,               -- villa id (e.g. villa-106) or 'common-area'
  reported_by_villa text,                -- the logged-in villa that raised it
  reporter_name text not null,
  reporter_phone text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_notes text,
  resolved_by text
);

create index if not exists issues_status_idx on issues (status);
create index if not exists issues_created_at_idx on issues (created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Every villa now signs in with its own Supabase Auth account (see
-- scripts/seed-users.mjs), so we require auth.uid() to be set for everything
-- below. Residents are only visible to their own villa. Issues are readable
-- and writable by any signed-in villa, matching the shared community log
-- behaviour - the UI additionally asks for an optional staff PIN before
-- resolving a ticket (see .env.example / VITE_STAFF_PIN), which is a soft
-- deterrent, not real access control.
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table residents enable row level security;
alter table issues enable row level security;

create policy "A villa can read its own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "A villa can update its own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "A villa can read its own residents"
  on residents for select
  using (villa_number = (select villa_number from profiles where id = auth.uid()));

create policy "A villa can add its own residents"
  on residents for insert
  with check (villa_number = (select villa_number from profiles where id = auth.uid()));

create policy "Any signed-in villa can read issues"
  on issues for select
  using (auth.uid() is not null);

create policy "Any signed-in villa can raise an issue"
  on issues for insert
  with check (auth.uid() is not null);

create policy "Any signed-in villa can update an issue (e.g. resolve it)"
  on issues for update
  using (auth.uid() is not null);

-- Enable realtime so the app updates live across everyone's phones
alter publication supabase_realtime add table issues;
