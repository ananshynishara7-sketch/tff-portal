-- The "Clear All for This Day" button deletes attendance_records rows, but
-- there was never a delete policy for that table - only select/insert/update
-- (see 0003). Row Level Security silently blocks any action with no
-- matching policy, so the delete quietly did nothing: the screen looked
-- cleared until the next reload pulled the (still-present) real data back.
create policy "Authenticated can delete attendance" on attendance_records
  for delete using (auth.uid() is not null);
