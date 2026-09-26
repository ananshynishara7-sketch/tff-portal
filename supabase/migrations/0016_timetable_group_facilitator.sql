-- Adds proper Group and Facilitator fields to sessions, instead of stuffing
-- them into the title text. Facilitator is a plain name for now (not linked
-- to a login account) since facilitator accounts don't exist yet.
alter table sessions
  add column group_name text,
  add column facilitator_name text;
