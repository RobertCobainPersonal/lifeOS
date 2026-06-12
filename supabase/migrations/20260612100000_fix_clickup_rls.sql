-- Allow authenticated users full access to clickup_tasks (sync + pin)
drop policy if exists "read clickup_tasks" on clickup_tasks;
create policy "authenticated users" on clickup_tasks
  for all using ((select auth.uid()) is not null);
