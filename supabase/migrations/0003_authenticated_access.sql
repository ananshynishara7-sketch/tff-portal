-- Temporary broad rule: any logged-in user (staff or participant) can read
-- and write these tables. This gets the app working end-to-end quickly.
-- We will tighten this to per-role rules (e.g. "facilitators can only see
-- their own participants") once each screen is built and we know exactly
-- what each role needs.

create policy "Authenticated can read participants" on participants
  for select using (auth.uid() is not null);
create policy "Authenticated can write participants" on participants
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update participants" on participants
  for update using (auth.uid() is not null);

create policy "Authenticated can read families" on families
  for select using (auth.uid() is not null);
create policy "Authenticated can write families" on families
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update families" on families
  for update using (auth.uid() is not null);

create policy "Authenticated can read attendance" on attendance_records
  for select using (auth.uid() is not null);
create policy "Authenticated can write attendance" on attendance_records
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update attendance" on attendance_records
  for update using (auth.uid() is not null);

create policy "Authenticated can read leave_requests" on leave_requests
  for select using (auth.uid() is not null);
create policy "Authenticated can write leave_requests" on leave_requests
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update leave_requests" on leave_requests
  for update using (auth.uid() is not null);

create policy "Authenticated can read sessions" on sessions
  for select using (auth.uid() is not null);
create policy "Authenticated can write sessions" on sessions
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update sessions" on sessions
  for update using (auth.uid() is not null);

create policy "Authenticated can read blocked_time" on blocked_time
  for select using (auth.uid() is not null);
create policy "Authenticated can write blocked_time" on blocked_time
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update blocked_time" on blocked_time
  for update using (auth.uid() is not null);

create policy "Authenticated can read announcements" on announcements
  for select using (auth.uid() is not null);
create policy "Authenticated can write announcements" on announcements
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update announcements" on announcements
  for update using (auth.uid() is not null);

create policy "Authenticated can read participant_assignments" on participant_assignments
  for select using (auth.uid() is not null);
create policy "Authenticated can write participant_assignments" on participant_assignments
  for insert with check (auth.uid() is not null);
