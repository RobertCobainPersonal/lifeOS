-- What got done: a running record of delivery, logged from the app or a phone Shortcut.
create table done_entries (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  text text not null check (length(text) between 1 and 500),
  source text not null default 'app' check (source in ('app', 'shortcut')),
  created_at timestamptz not null default now()
);
create index done_entries_day_idx on done_entries (day);
alter table done_entries enable row level security;
create policy "owner only" on done_entries for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
