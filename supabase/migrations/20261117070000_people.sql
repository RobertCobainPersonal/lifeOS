-- Keeping in touch: a list of people and a rhythm for each. Additive only.
create table people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cadence_days int not null default 30 check (cadence_days between 1 and 365),
  last_contact date,
  note text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
alter table people enable row level security;
create policy "owner only" on people for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
