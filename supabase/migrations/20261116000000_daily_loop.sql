-- Daily loop: day log, time entries (focus + track), fuel, health.
-- Additive only.

create table day_log (
  day date primary key,
  one_thing_task_id uuid references tasks(id) on delete set null,
  one_thing_clickup_id text,
  kcal_target int,
  protein_target int,
  closeout jsonb,
  closed_at timestamptz
);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  mode text not null check (mode in ('focus','track')),
  category text not null check (category in (
    'deep_work','meetings','admin','reactive','procrastinating',
    'personal_project','learning','rest','exercise')),
  energy smallint check (energy between 1 and 5),
  task_id uuid references tasks(id) on delete set null,
  clickup_id text,
  label text,
  planned_minutes int check (planned_minutes between 1 and 240),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  paused_at timestamptz,
  paused_seconds int not null default 0,
  distractions int not null default 0,
  done_note text,
  next_note text,
  check (mode = 'track' or planned_minutes is not null)
);

-- only one open entry at a time
create unique index time_one_open on time_entries ((true)) where ended_at is null;
create index time_entries_day_idx on time_entries (day);
create index time_entries_task_idx on time_entries (task_id);

create table saved_meals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  kcal int not null check (kcal between 0 and 5000),
  protein_g int not null default 0,
  use_count int not null default 0
);

create table food_entries (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  label text not null,
  kcal int not null check (kcal between 0 and 5000),
  protein_g int not null default 0,
  meal_id uuid references saved_meals(id) on delete set null,
  created_at timestamptz default now()
);
create index food_entries_day_idx on food_entries (day);
create index food_entries_meal_idx on food_entries (meal_id);

create table activities (
  source text not null,
  source_id text not null,
  started_at timestamptz not null,
  day date not null,
  type text,
  distance_m int,
  moving_seconds int,
  avg_hr int,
  kcal int,
  primary key (source, source_id)
);
create index activities_day_idx on activities (day);

create table daily_health (
  day date primary key,
  sleep_minutes int,
  resting_hr int,
  hrv int,
  updated_at timestamptz default now()
);

create index day_log_one_thing_idx on day_log (one_thing_task_id);

alter table settings
  add column if not exists journal_prompts jsonb
    default '["What went well today?","What got in the way?","What matters most tomorrow?"]'::jsonb,
  add column if not exists default_kcal int default 2400,
  add column if not exists default_protein int default 160;

alter table day_log enable row level security;
alter table time_entries enable row level security;
alter table saved_meals enable row level security;
alter table food_entries enable row level security;
alter table activities enable row level security;
alter table daily_health enable row level security;

create policy "authenticated users" on day_log for all using ((select auth.uid()) is not null);
create policy "authenticated users" on time_entries for all using ((select auth.uid()) is not null);
create policy "authenticated users" on saved_meals for all using ((select auth.uid()) is not null);
create policy "authenticated users" on food_entries for all using ((select auth.uid()) is not null);
create policy "authenticated users" on activities for all using ((select auth.uid()) is not null);
create policy "authenticated users" on daily_health for all using ((select auth.uid()) is not null);
