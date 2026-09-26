-- Lets a logged-in person read their OWN profile row (needed so the app can
-- find out their role and send them to the right dashboard after login).
create policy "Users can read their own profile"
  on profiles for select
  using (auth.uid() = id);
