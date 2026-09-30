-- Flag Carriers becomes a multi-year tracker: each graduating class (Class of
-- 2024, 2025, 2026, ...) is its own cohort, picked from a Year dropdown in the
-- app. cohort_year is free text (not an enum) so a brand-new year never needs
-- a migration - it just gets typed in when that year's roster is added.
alter table flag_carriers add column cohort_year text not null default '2024';

-- The exact wording of each field varies year to year (e.g. 2024's sheet says
-- "Employer", 2025's says "Employer / Location") - rather than hardcode either,
-- every field's header/label is editable in the app and stored here.
create table flag_carrier_field_labels (
  field_key text primary key,
  label text not null
);

alter table flag_carrier_field_labels enable row level security;
create policy "Authenticated can read flag_carrier_field_labels" on flag_carrier_field_labels for select using (auth.uid() is not null);
create policy "Authenticated can insert flag_carrier_field_labels" on flag_carrier_field_labels for insert with check (auth.uid() is not null);
create policy "Authenticated can update flag_carrier_field_labels" on flag_carrier_field_labels for update using (auth.uid() is not null);
create policy "Authenticated can delete flag_carrier_field_labels" on flag_carrier_field_labels for delete using (auth.uid() is not null);

insert into flag_carrier_field_labels (field_key, label) values
  ('full_name', 'Name'),
  ('family', 'Family'),
  ('main_diploma', 'Diploma'),
  ('nic', 'NIC'),
  ('date_of_birth', 'Date of birth'),
  ('gender', 'Gender'),
  ('mobile', 'Mobile'),
  ('whatsapp', 'WhatsApp'),
  ('email', 'Email'),
  ('address', 'Address'),
  ('studying', 'Studying?'),
  ('study_mode', 'Study mode'),
  ('program_course', 'Program / course'),
  ('institution', 'Institution'),
  ('working', 'Working?'),
  ('work_mode', 'Work mode'),
  ('job_role', 'Job role'),
  ('employer', 'Employer'),
  ('areas_of_interest', 'Areas of interest'),
  ('salary', 'Salary (optional)'),
  ('notes', 'Notes'),
  ('follow_up', 'Needs follow-up?');
