-- Calendar events sent from the phone. Additive only.
create table calendar_events (
  source text not null,
  source_id text not null,
  day date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  title text not null,
  location text,
  calendar text,
  received_at timestamptz default now(),
  primary key (source, source_id)
);
create index calendar_events_day_idx on calendar_events (day);

alter table calendar_events enable row level security;
create policy "authenticated users" on calendar_events for all using ((select auth.uid()) is not null);
