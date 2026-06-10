-- Fix deprecated auth.role() in RLS policies
drop policy "authenticated users" on captures;
drop policy "authenticated users" on tasks;
drop policy "authenticated users" on clickup_tasks;
drop policy "authenticated users" on settings;

create policy "authenticated users" on captures for all using ((select auth.uid()) is not null);
create policy "authenticated users" on tasks for all using ((select auth.uid()) is not null);
create policy "read clickup_tasks" on clickup_tasks for select using ((select auth.uid()) is not null);
create policy "authenticated users" on settings for all using ((select auth.uid()) is not null);

-- Indexes for app query patterns
create index on tasks (status);
create index on tasks (is_top3, top3_date) where is_top3 = true;
create index on captures (created_at) where triaged_at is null;

-- Auto-update last_touched_at on any task edit
create or replace function touch_task()
returns trigger
language plpgsql
as $$
begin
  new.last_touched_at = now();
  return new;
end;
$$;

create trigger tasks_touch
  before update on tasks
  for each row
  execute function touch_task();
