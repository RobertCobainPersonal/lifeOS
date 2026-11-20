-- ClickUp: follow chosen lists and single tasks instead of mirroring everything assigned.
create table clickup_follows (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('list', 'task')),
  clickup_id text not null,
  name text not null,
  path text,
  total_count int,
  closed_count int,
  overdue_count int,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, clickup_id)
);
alter table clickup_follows enable row level security;
create policy "owner only" on clickup_follows for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

alter table clickup_tasks
  add column list_id text,
  add column mine boolean not null default true,
  add column assignees text[] not null default '{}';
create index clickup_tasks_list_idx on clickup_tasks (list_id);
