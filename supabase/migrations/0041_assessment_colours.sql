-- Lets phases, PGI bands (High/Mid/Low) and growth trajectories
-- (Rising/Stable/Declining) all get their own editable name + colour,
-- the same "Edit Colours" pattern used for timetable groups/locations and
-- to-do statuses, instead of being hardcoded in the app.
alter table assessment_phases add column color text not null default '#022269';

create table assessment_bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  min_pgi numeric not null, -- a score qualifies for this band once it's >= min_pgi (checked highest threshold first)
  sort_order int not null default 0
);

create table assessment_trajectories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  min_growth numeric not null, -- a growth % qualifies once it's >= min_growth (checked highest threshold first)
  sort_order int not null default 0
);

alter table assessment_bands enable row level security;
alter table assessment_trajectories enable row level security;

create policy "Authenticated can read assessment_bands" on assessment_bands for select using (auth.uid() is not null);
create policy "Authenticated can insert assessment_bands" on assessment_bands for insert with check (auth.uid() is not null);
create policy "Authenticated can update assessment_bands" on assessment_bands for update using (auth.uid() is not null);
create policy "Authenticated can delete assessment_bands" on assessment_bands for delete using (auth.uid() is not null);

create policy "Authenticated can read assessment_trajectories" on assessment_trajectories for select using (auth.uid() is not null);
create policy "Authenticated can insert assessment_trajectories" on assessment_trajectories for insert with check (auth.uid() is not null);
create policy "Authenticated can update assessment_trajectories" on assessment_trajectories for update using (auth.uid() is not null);
create policy "Authenticated can delete assessment_trajectories" on assessment_trajectories for delete using (auth.uid() is not null);

insert into assessment_bands (name, color, min_pgi, sort_order) values
  ('High', '#16a34a', 60, 0),
  ('Mid', '#ca8a04', 40, 1),
  ('Low', '#dc2626', -999999, 2);

insert into assessment_trajectories (name, color, min_growth, sort_order) values
  ('Rising', '#16a34a', 5, 0),
  ('Stable', '#ca8a04', -5, 1),
  ('Declining', '#dc2626', -999999, 2);

update assessment_phases set color = '#0891b2' where name = '① IEP Baseline';
update assessment_phases set color = '#7c3aed' where name = '② Phase 1';
update assessment_phases set color = '#c2410c' where name = '③ Umbrella Problem';
update assessment_phases set color = '#2563eb' where name = '④ Phase 2';
