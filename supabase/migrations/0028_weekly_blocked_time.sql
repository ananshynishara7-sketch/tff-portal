-- Recurring weekly Blocked Time template (Mon-Fri), matching the layout of
-- Nishara's own blocked-time sheet: a Time, a Priority tag, and a Task, for
-- each weekday. Unlike the old unused `blocked_time` table from the very
-- first migration (which was date-specific), this repeats every week rather
-- than being tied to a particular date.
create table weekly_blocked_time (
  id uuid primary key default gen_random_uuid(),
  facilitator_id uuid not null references profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 5), -- 1=Mon .. 5=Fri
  start_time time not null,
  priority text check (priority in ('Very High', 'High', 'Med', 'Low')),
  task text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facilitator_id, day_of_week, start_time)
);

create index idx_weekly_blocked_time_facilitator on weekly_blocked_time (facilitator_id);

alter table weekly_blocked_time enable row level security;

create policy "Authenticated can read weekly_blocked_time" on weekly_blocked_time
  for select using (auth.uid() is not null);
create policy "Authenticated can insert weekly_blocked_time" on weekly_blocked_time
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update weekly_blocked_time" on weekly_blocked_time
  for update using (auth.uid() is not null);
create policy "Authenticated can delete weekly_blocked_time" on weekly_blocked_time
  for delete using (auth.uid() is not null);
