-- Facilitator details + leave log, for the new Facilitators dashboard.
-- Separate from `profiles` because facilitators don't have login accounts
-- yet - this just tracks who they are and when they're on leave.

create table facilitators (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  role_title text, -- e.g. "English Language", "Employability Skills"
  join_date date,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Admin-logged leave for a facilitator (no self-service submission yet,
-- since facilitators don't have logins).
create table facilitator_leave (
  id uuid primary key default gen_random_uuid(),
  facilitator_id uuid not null references facilitators(id) on delete cascade,
  leave_start_date date not null,
  leave_end_date date not null,
  reason text,
  logged_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_facilitator_leave_facilitator on facilitator_leave (facilitator_id);

alter table facilitators enable row level security;
alter table facilitator_leave enable row level security;

-- All four policies added up front for both tables, so nothing silently
-- fails the way attendance_records deletes once did.
create policy "Authenticated can read facilitators" on facilitators
  for select using (auth.uid() is not null);
create policy "Authenticated can insert facilitators" on facilitators
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update facilitators" on facilitators
  for update using (auth.uid() is not null);
create policy "Authenticated can delete facilitators" on facilitators
  for delete using (auth.uid() is not null);

create policy "Authenticated can read facilitator_leave" on facilitator_leave
  for select using (auth.uid() is not null);
create policy "Authenticated can insert facilitator_leave" on facilitator_leave
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update facilitator_leave" on facilitator_leave
  for update using (auth.uid() is not null);
create policy "Authenticated can delete facilitator_leave" on facilitator_leave
  for delete using (auth.uid() is not null);

-- Seed with the existing facilitator names, in the order already used on
-- the Masterplan Phase 3 page's Facilitator dropdown.
insert into facilitators (full_name, sort_order) values
  ('Suba', 0),
  ('Jeyastan', 1),
  ('Nishara', 2),
  ('Gajan', 3),
  ('Jenny', 4),
  ('Rageethan', 5),
  ('Thuvarahan', 6),
  ('Dakshika', 7),
  ('Jericksha', 8);
