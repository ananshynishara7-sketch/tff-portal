-- Personal to-do list per facilitator, modelled on Nishara's own
-- "To-Do List" spreadsheet (category, task, who assigned it, due date,
-- recurring/frequency, an Eisenhower urgency/importance split, status,
-- accountability partner, resources needed). Same ownership pattern as
-- weekly_blocked_time: each facilitator edits their own, admin/lead
-- facilitator can view read-only.
create table facilitator_todos (
  id uuid primary key default gen_random_uuid(),
  facilitator_id uuid not null references profiles(id) on delete cascade,
  category text,
  task text not null,
  assigned_by text,
  due_date date,
  recurring boolean not null default false,
  frequency text,
  urgency text check (urgency in ('Urgent', 'Not Urgent')),
  importance text check (importance in ('Important', 'Not Important')),
  status text not null default 'To Do' check (status in ('To Do', 'In Progress', 'Done', 'Cancelled')),
  accountability_partner text,
  resources_needed text,
  -- Set by the app when status flips to 'Done' - used for the "Done this
  -- week / this month" stats, since that's about when it was finished, not
  -- the due date.
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_facilitator_todos_facilitator on facilitator_todos (facilitator_id);

alter table facilitator_todos enable row level security;

create policy "Authenticated can read facilitator_todos" on facilitator_todos
  for select using (auth.uid() is not null);
create policy "Authenticated can insert facilitator_todos" on facilitator_todos
  for insert with check (auth.uid() is not null);
create policy "Authenticated can update facilitator_todos" on facilitator_todos
  for update using (auth.uid() is not null);
create policy "Authenticated can delete facilitator_todos" on facilitator_todos
  for delete using (auth.uid() is not null);
