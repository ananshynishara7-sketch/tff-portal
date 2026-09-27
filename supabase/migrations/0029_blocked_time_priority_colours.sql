-- Lets the Blocked Time priority tags (Very High/High/Med/Low) have
-- editable colours, same idea as the Masterplan's editable group colours.
create table blocked_time_priorities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table blocked_time_priorities enable row level security;

create policy "Authenticated can read blocked_time_priorities" on blocked_time_priorities
  for select using (auth.uid() is not null);
create policy "Authenticated can insert blocked_time_priorities" on blocked_time_priorities
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update blocked_time_priorities" on blocked_time_priorities
  for update using (auth.uid() is not null);
create policy "Authenticated can delete blocked_time_priorities" on blocked_time_priorities
  for delete using (auth.uid() is not null);

insert into blocked_time_priorities (name, color, sort_order) values
  ('Very High', '#dc2626', 0),
  ('High', '#f97316', 1),
  ('Med', '#eab308', 2),
  ('Low', '#9ca3af', 3);
