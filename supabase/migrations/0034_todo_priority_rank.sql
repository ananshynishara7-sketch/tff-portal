-- The "Priority Rank" column from the reference spreadsheet - a plain
-- number the person sets by hand to order tasks within a day, separate
-- from the Urgency/Importance quadrant.
alter table facilitator_todos add column if not exists priority_rank int;
