-- Same pattern as timetable_groups: an editable, colour-tagged list of
-- rooms/places, so a Location dropdown can be added to the Masterplan
-- alongside the existing Group dropdown.
create table timetable_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table timetable_locations enable row level security;

create policy "Authenticated can read timetable_locations" on timetable_locations
  for select using (auth.uid() is not null);
create policy "Authenticated can insert timetable_locations" on timetable_locations
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update timetable_locations" on timetable_locations
  for update using (auth.uid() is not null);
create policy "Authenticated can delete timetable_locations" on timetable_locations
  for delete using (auth.uid() is not null);

insert into timetable_locations (name, color, sort_order) values
  ('Library', '#0891b2', 0),
  ('Hearth', '#c2410c', 1),
  ('Atrium', '#7c3aed', 2);

-- Which place a session is happening in - matched against
-- timetable_locations by name, same lightweight way group_name is matched
-- against timetable_groups, rather than a strict foreign key.
alter table sessions add column if not exists location_name text;
