-- Lets logged-in staff delete a group (only used when a group has no
-- active participants left in it, enforced in the app itself).
create policy "Authenticated can delete families" on families
  for delete using (auth.uid() is not null);
