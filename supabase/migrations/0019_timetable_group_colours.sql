-- Lets colours for the Timetable's groups be picked in the app instead of
-- being fixed in the code. "Everyone" is a real row here too (used for
-- sessions with no group set), so its colour can be changed as well.
create table timetable_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table timetable_groups enable row level security;

create policy "Authenticated can read timetable_groups" on timetable_groups
  for select using (auth.uid() is not null);
create policy "Authenticated can write timetable_groups" on timetable_groups
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update timetable_groups" on timetable_groups
  for update using (auth.uid() is not null);
create policy "Authenticated can delete timetable_groups" on timetable_groups
  for delete using (auth.uid() is not null);

insert into timetable_groups (name, color, sort_order) values
  ('Everyone', '#6b7280', 0),
  ('Spartans', '#ef4444', 1),
  ('Thebans', '#3b82f6', 2),
  ('Athenians', '#10b981', 3);
