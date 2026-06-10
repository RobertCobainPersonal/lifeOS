-- captures: raw inbox items
create table captures (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  source text check (source in ('manual','share','voice','email')),
  url text,
  created_at timestamptz default now(),
  triaged_at timestamptz,
  triage_result text check (triage_result in ('task','someday','done','deleted'))
);

-- tasks: the working list
create table tasks (
  id uuid primary key default gen_random_uuid(),
  capture_id uuid references captures(id) on delete set null,
  title text not null,
  domain text check (domain in ('work','personal')),
  energy text check (energy in ('deep','admin')),
  due_date date,
  status text check (status in ('open','done','someday','deferred')) default 'open',
  is_top3 boolean default false,
  top3_date date,
  deferred_by_reset boolean default false,
  last_touched_at timestamptz default now(),
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- clickup_tasks: read-only ClickUp mirror
create table clickup_tasks (
  clickup_id text primary key,
  title text,
  status text,
  due_date date,
  url text,
  list_name text,
  pinned_top3_date date,
  synced_at timestamptz
);

-- settings: single-row config
create table settings (
  id int primary key default 1,
  slipping_days int default 5,
  clickup_token_set boolean default false,
  constraint single_row check (id = 1)
);

insert into settings (id) values (1);

-- RLS: single-user app — any authenticated user owns all rows
alter table captures enable row level security;
alter table tasks enable row level security;
alter table clickup_tasks enable row level security;
alter table settings enable row level security;

create policy "authenticated users" on captures for all using (auth.role() = 'authenticated');
create policy "authenticated users" on tasks for all using (auth.role() = 'authenticated');
create policy "authenticated users" on clickup_tasks for all using (auth.role() = 'authenticated');
create policy "authenticated users" on settings for all using (auth.role() = 'authenticated');
