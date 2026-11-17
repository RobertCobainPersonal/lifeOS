-- Lock every table to the one account that owns this LifeOS.
-- Before: any signed-in user could read and write everything.
-- After: only the owner can, whatever the project's sign-up setting is.

create table if not exists app_owner (
  user_id uuid primary key references auth.users(id)
);
-- No policies: readable only through is_owner() and the service role.
alter table app_owner enable row level security;

do $$
begin
  if (select count(*) from auth.users) <> 1 then
    raise exception 'Expected exactly one account to make the owner; found %', (select count(*) from auth.users);
  end if;
  insert into app_owner (user_id)
  select id from auth.users
  on conflict do nothing;
end $$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = (select user_id from public.app_owner limit 1)
$$;

revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'activities','calendar_events','captures','clickup_tasks','daily_health','day_log',
    'food_entries','habit_ticks','habits','projects','saved_meals','settings','tasks','time_entries'
  ] loop
    execute format('drop policy if exists "authenticated users" on public.%I', t);
    execute format('drop policy if exists "owner only" on public.%I', t);
    execute format(
      'create policy "owner only" on public.%I for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()))',
      t
    );
  end loop;
end $$;
