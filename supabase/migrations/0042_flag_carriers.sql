-- "Flag Carriers" - the Class of 2024 alumni tracker. These are past
-- participants who've since left the program; every ~6 months they're asked
-- what they're doing (studying/working/etc) and that gets logged as a new
-- "round" (the sheet has "May 2025" and "June 2026" so far, and a new round
-- will get added every 6 months going forward - "round_label" is just free
-- text so there's nothing to predefine).
create table flag_carriers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  family_id uuid references families(id) on delete set null,
  main_diploma text, -- Participation / Completion / Achievement
  nic text,
  date_of_birth date,
  gender text,
  mobile text,
  whatsapp text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create table flag_carrier_updates (
  id uuid primary key default gen_random_uuid(),
  flag_carrier_id uuid not null references flag_carriers(id) on delete cascade,
  round_label text not null, -- e.g. 'May 2025', 'June 2026'
  round_date date,
  studying boolean,
  study_mode text,
  program_course text,
  institution text,
  working boolean,
  work_mode text,
  job_role text,
  employer text,
  areas_of_interest text,
  salary text,
  notes text,
  follow_up boolean not null default false,
  entered_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (flag_carrier_id, round_label)
);

alter table flag_carriers enable row level security;
alter table flag_carrier_updates enable row level security;

create policy "Authenticated can read flag_carriers" on flag_carriers for select using (auth.uid() is not null);
create policy "Authenticated can insert flag_carriers" on flag_carriers for insert with check (auth.uid() is not null);
create policy "Authenticated can update flag_carriers" on flag_carriers for update using (auth.uid() is not null);
create policy "Authenticated can delete flag_carriers" on flag_carriers for delete using (auth.uid() is not null);

create policy "Authenticated can read flag_carrier_updates" on flag_carrier_updates for select using (auth.uid() is not null);
create policy "Authenticated can insert flag_carrier_updates" on flag_carrier_updates for insert with check (auth.uid() is not null);
create policy "Authenticated can update flag_carrier_updates" on flag_carrier_updates for update using (auth.uid() is not null);
create policy "Authenticated can delete flag_carrier_updates" on flag_carrier_updates for delete using (auth.uid() is not null);
