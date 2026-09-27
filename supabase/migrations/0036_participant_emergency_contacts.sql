-- Two emergency contacts per participant, each with how they're related to
-- the participant (e.g. "Mother", "Guardian").
alter table participants add column if not exists emergency_contact_1_name text;
alter table participants add column if not exists emergency_contact_1_phone text;
alter table participants add column if not exists emergency_contact_1_relationship text;
alter table participants add column if not exists emergency_contact_2_name text;
alter table participants add column if not exists emergency_contact_2_phone text;
alter table participants add column if not exists emergency_contact_2_relationship text;
