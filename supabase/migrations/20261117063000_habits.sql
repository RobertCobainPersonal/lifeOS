-- Non-negotiables: a short list of daily ticks. Additive only.
create table habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort int not null default 0,
  archived boolean not null default false,
  created_at timestamptz default now()
);
create table habit_ticks (
  habit_id uuid not null references habits(id) on delete cascade,
  day date not null,
  primary key (habit_id, day)
);
create index habit_ticks_day_idx on habit_ticks (day);
alter table habits enable row level security;
alter table habit_ticks enable row level security;
create policy "authenticated users" on habits for all using ((select auth.uid()) is not null);
create policy "authenticated users" on habit_ticks for all using ((select auth.uid()) is not null);
