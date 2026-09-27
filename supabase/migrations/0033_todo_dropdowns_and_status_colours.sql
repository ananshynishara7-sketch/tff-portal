-- Task statuses become an editable colour-tagged list (same pattern as
-- blocked_time_priorities), so the old hardcoded CHECK no longer fits.
alter table facilitator_todos drop constraint if exists facilitator_todos_status_check;

-- A second person field: who the task is assigned TO, separate from who
-- assigned it.
alter table facilitator_todos add column if not exists assigned_to text;

create table todo_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table todo_statuses enable row level security;

create policy "Authenticated can read todo_statuses" on todo_statuses
  for select using (auth.uid() is not null);
create policy "Authenticated can insert todo_statuses" on todo_statuses
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update todo_statuses" on todo_statuses
  for update using (auth.uid() is not null);
create policy "Authenticated can delete todo_statuses" on todo_statuses
  for delete using (auth.uid() is not null);

insert into todo_statuses (name, color, sort_order) values
  ('To Do', '#ef4444', 0),
  ('In Progress', '#22c55e', 1),
  ('Pending', '#f59e0b', 2),
  ('Done', '#3b82f6', 3),
  ('Overdue', '#991b1b', 4),
  ('Cancelled', '#6b7280', 5);
