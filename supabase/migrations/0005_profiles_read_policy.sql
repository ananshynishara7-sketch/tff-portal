-- Lets any logged-in user see the staff directory (needed for counts like
-- "Total Facilitators" on the dashboard, and the future Facilitators page).
create policy "Authenticated can read all profiles" on profiles
  for select using (auth.uid() is not null);
