-- The Timetable page's Delete button needs this - without it, deletes would
-- silently do nothing, the same way Clear All did before 0010 added the
-- matching policy for attendance_records.
create policy "Authenticated can delete sessions" on sessions
  for delete using (auth.uid() is not null);
