-- =========================================================================
-- The Flag Forum Portal - Initial Database Structure
-- =========================================================================
-- This file creates every table the portal needs. Run it once inside your
-- Supabase project (SQL Editor -> paste this file -> Run) after the project
-- is created.
-- =========================================================================

-- ---------- ROLES & USERS ----------
-- Every person who can log in - admin, lead facilitator, facilitator,
-- facilitator support, or participant.
create type user_role as enum (
  'admin',
  'lead_facilitator',
  'facilitator',
  'facilitator_support',
  'participant'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  phone text,
  created_at timestamptz not null default now()
);

-- ---------- GROUPS / FAMILIES ----------
-- Editable groups (today: Arising Brilliance, Believers, Benevolent, Loving).
-- Admin can rename, add, or retire these from the app - never hardcoded.
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_color text not null default '#022269',
  created_at timestamptz not null default now()
);

-- ---------- PARTICIPANTS ----------
create table participants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  family_id uuid references families(id) on delete set null,
  joining_date date,
  status text not null default 'Active' check (status in ('Active', 'On Leave', 'Left')),
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);

-- Which facilitator(s) are assigned to which participant
create table participant_assignments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  facilitator_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (participant_id, facilitator_id)
);

-- ---------- ATTENDANCE ----------
-- One row per participant per day. Codes match the existing register:
--   /  = present            A  = approved absence
--   N  = not authorised     L  = late
--   HA = half day, approved (costs nothing)
--   HN = half day, not approved (costs half a day)
create type attendance_code as enum ('/', 'A', 'N', 'L', 'HA', 'HN');

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  date date not null,
  code attendance_code not null,
  marked_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, date)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  request_type text not null check (request_type in ('Half Day AM', 'Half Day PM', 'Full Day', 'Late')),
  reason text,
  details text,
  evidence_file_url text,
  leave_start_date date not null,
  leave_end_date date not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Declined')),
  decided_by uuid references profiles(id),
  decision_date timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- TIMETABLE / SCHEDULE ----------
create table sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade, -- null = applies to everyone
  facilitator_id uuid references profiles(id),
  title text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

-- A facilitator's personal blocked time / to-do / deadlines (from the daily
-- planner sheet), kept separate from shared sessions above.
create table blocked_time (
  id uuid primary key default gen_random_uuid(),
  facilitator_id uuid not null references profiles(id) on delete cascade,
  label text not null,
  category text not null check (category in ('to_do', 'family_time', 'deadline', 'observation', 'other')),
  date date not null,
  start_time time,
  end_time time,
  created_at timestamptz not null default now()
);

-- ---------- ANNOUNCEMENTS ----------
create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  posted_by uuid references profiles(id),
  target_role user_role, -- null = everyone
  target_family_id uuid references families(id), -- null = everyone
  urgent boolean not null default false,
  posted_at timestamptz not null default now()
);

-- ---------- INDEXES ----------
create index idx_attendance_participant_date on attendance_records (participant_id, date);
create index idx_leave_requests_participant on leave_requests (participant_id);
create index idx_sessions_date on sessions (date);
create index idx_participants_family on participants (family_id);

-- ---------- ROW LEVEL SECURITY ----------
-- Turned on for every table. Detailed per-role policies (who can read/write
-- what) are added in the next migration once roles are wired into auth.
alter table profiles enable row level security;
alter table families enable row level security;
alter table participants enable row level security;
alter table participant_assignments enable row level security;
alter table attendance_records enable row level security;
alter table leave_requests enable row level security;
alter table sessions enable row level security;
alter table blocked_time enable row level security;
alter table announcements enable row level security;
