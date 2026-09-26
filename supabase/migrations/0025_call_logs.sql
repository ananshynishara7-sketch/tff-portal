-- Call Log for the "Needs Following Up" table on the admin Dashboard -
-- mirrors the old Google Sheet's separate Call Log tab, but here it's just
-- extra columns right on the same row (matched by participant + date, same
-- idea as the Sheet matching by name + date).
create table call_logs (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  call_date date not null,
  call_outcome text,
  what_they_said text,
  called_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, call_date)
);

create index idx_call_logs_date on call_logs (call_date);

alter table call_logs enable row level security;

create policy "Authenticated can read call_logs" on call_logs
  for select using (auth.uid() is not null);
create policy "Authenticated can insert call_logs" on call_logs
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update call_logs" on call_logs
  for update using (auth.uid() is not null);
create policy "Authenticated can delete call_logs" on call_logs
  for delete using (auth.uid() is not null);
