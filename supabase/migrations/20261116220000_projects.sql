-- Projects group tasks into Now / Next / Later. Additive only.

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  detail text,
  is_focus boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz default now()
);

-- at most one focus project
create unique index projects_one_focus on projects ((true)) where is_focus;

alter table tasks
  add column if not exists project_id uuid references projects(id) on delete set null,
  add column if not exists band text check (band in ('now','next','later')),
  add column if not exists project_sort int;

create index tasks_project_idx on tasks (project_id);

alter table projects enable row level security;
create policy "authenticated users" on projects for all using ((select auth.uid()) is not null);
