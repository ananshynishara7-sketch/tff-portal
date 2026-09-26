-- The Facilitators dashboard's new "Remove" button on an announcement needs
-- this - without it, deletes would silently do nothing (same pattern as
-- attendance_records/sessions before their delete policies were added).
create policy "Authenticated can delete announcements" on announcements
  for delete using (auth.uid() is not null);
