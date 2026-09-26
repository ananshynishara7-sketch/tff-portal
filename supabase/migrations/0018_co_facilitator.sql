-- Adds a second facilitator slot to each session, same fixed name list as
-- the main Facilitator field.
alter table sessions add column co_facilitator_name text;
