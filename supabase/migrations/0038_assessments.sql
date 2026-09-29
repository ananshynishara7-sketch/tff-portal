-- Assessment phases (IEP baseline, Phase 1, Umbrella, Phase 2, Phase 3, ...) -
-- an open-ended, admin/lead-facilitator-defined list. Each phase can measure
-- something completely different, and new phases get added every term, so
-- this isn't a fixed set of columns anywhere in the app.
create table assessment_phases (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_baseline boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- What's actually scored within a phase (e.g. IEP has "Fluency" and
-- "Confidence"; Phase 1 has five subjects; Umbrella has just one).
-- "weight" is that component's share of the phase's overall /100 score -
-- weights for a phase are normalised by the app, so they don't strictly
-- need to add up to 1.
create table assessment_components (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references assessment_phases(id) on delete cascade,
  name text not null,
  max_score numeric not null,
  weight numeric not null default 1,
  sort_order int not null default 0
);

-- One row per participant per phase - the phase's overall /100 score, band
-- and growth % are all calculated in the app from the component scores +
-- weights below, not stored here, so they can never drift out of sync with
-- the rubric.
create table assessment_scores (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references assessment_phases(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  notes text,
  entered_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phase_id, participant_id)
);

create table assessment_component_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_score_id uuid not null references assessment_scores(id) on delete cascade,
  component_id uuid not null references assessment_components(id) on delete cascade,
  raw_value numeric not null,
  unique (assessment_score_id, component_id)
);

alter table assessment_phases enable row level security;
alter table assessment_components enable row level security;
alter table assessment_scores enable row level security;
alter table assessment_component_scores enable row level security;

create policy "Authenticated can read assessment_phases" on assessment_phases for select using (auth.uid() is not null);
create policy "Authenticated can insert assessment_phases" on assessment_phases for insert with check (auth.uid() is not null);
create policy "Authenticated can update assessment_phases" on assessment_phases for update using (auth.uid() is not null);
create policy "Authenticated can delete assessment_phases" on assessment_phases for delete using (auth.uid() is not null);

create policy "Authenticated can read assessment_components" on assessment_components for select using (auth.uid() is not null);
create policy "Authenticated can insert assessment_components" on assessment_components for insert with check (auth.uid() is not null);
create policy "Authenticated can update assessment_components" on assessment_components for update using (auth.uid() is not null);
create policy "Authenticated can delete assessment_components" on assessment_components for delete using (auth.uid() is not null);

create policy "Authenticated can read assessment_scores" on assessment_scores for select using (auth.uid() is not null);
create policy "Authenticated can insert assessment_scores" on assessment_scores for insert with check (auth.uid() is not null);
create policy "Authenticated can update assessment_scores" on assessment_scores for update using (auth.uid() is not null);
create policy "Authenticated can delete assessment_scores" on assessment_scores for delete using (auth.uid() is not null);

create policy "Authenticated can read assessment_component_scores" on assessment_component_scores for select using (auth.uid() is not null);
create policy "Authenticated can insert assessment_component_scores" on assessment_component_scores for insert with check (auth.uid() is not null);
create policy "Authenticated can update assessment_component_scores" on assessment_component_scores for update using (auth.uid() is not null);
create policy "Authenticated can delete assessment_component_scores" on assessment_component_scores for delete using (auth.uid() is not null);

-- Seed today's 4 phases with the rubric weights that reproduce the
-- September 2026 sheet's own PGI numbers (Fluency/Confidence 70/30 for IEP
-- and Phase 2, five equally-weighted subjects for Phase 1, a single
-- component for Umbrella). Confidence is entered as a plain 1-6 self/rater
-- rating going forward.
insert into assessment_phases (name, is_baseline, sort_order) values
  ('① IEP Baseline', true, 0),
  ('② Phase 1', false, 1),
  ('③ Umbrella Problem', false, 2),
  ('④ Phase 2', false, 3);

insert into assessment_components (phase_id, name, max_score, weight, sort_order)
select id, 'Fluency', 6, 0.7, 0 from assessment_phases where name = '① IEP Baseline'
union all
select id, 'Confidence', 6, 0.3, 1 from assessment_phases where name = '① IEP Baseline';

insert into assessment_components (phase_id, name, max_score, weight, sort_order)
select id, 'Speaking', 20, 0.2, 0 from assessment_phases where name = '② Phase 1'
union all
select id, 'Writing', 12, 0.2, 1 from assessment_phases where name = '② Phase 1'
union all
select id, 'Listening', 16, 0.2, 2 from assessment_phases where name = '② Phase 1'
union all
select id, 'Reading', 30, 0.2, 3 from assessment_phases where name = '② Phase 1'
union all
select id, 'Grammar', 20, 0.2, 4 from assessment_phases where name = '② Phase 1';

insert into assessment_components (phase_id, name, max_score, weight, sort_order)
select id, 'Assessment Score', 5, 1, 0 from assessment_phases where name = '③ Umbrella Problem';

insert into assessment_components (phase_id, name, max_score, weight, sort_order)
select id, 'Fluency', 6, 0.7, 0 from assessment_phases where name = '④ Phase 2'
union all
select id, 'Confidence', 6, 0.3, 1 from assessment_phases where name = '④ Phase 2';
