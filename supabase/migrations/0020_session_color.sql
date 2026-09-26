-- Lets each session have its own colour, picked directly on the Add/Edit
-- Session form (instead of only being able to change colours per Group).
-- When a session has no colour of its own, the app falls back to its
-- Group's colour, or the "Everyone" colour.
alter table sessions add column color text;
