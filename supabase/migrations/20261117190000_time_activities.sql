-- Editable activities: groups (Work, Hockey…) with optional parts (Playing…).
-- Time entries point at an activity; the old fixed category stays for older rows.
create table time_activities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 40),
  parent_id uuid references time_activities(id) on delete restrict,
  sort int not null default 0,
  archived boolean not null default false,
  legacy_category text unique,
  created_at timestamptz not null default now()
);
create index time_activities_parent_idx on time_activities (parent_id);
alter table time_activities enable row level security;
create policy "owner only" on time_activities for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));

alter table time_entries
  add column activity_id uuid references time_activities(id) on delete set null;
create index time_entries_activity_idx on time_entries (activity_id);
alter table time_entries alter column category drop not null;

-- Starting list
with g as (
  insert into time_activities (name, sort, legacy_category) values
    ('Work', 1, null), ('Home', 2, null), ('Downtime', 3, null),
    ('Hockey', 4, null), ('Golf', 5, null), ('Exercise', 6, 'exercise'),
    ('Personal project', 7, 'personal_project'), ('Learning', 8, 'learning'),
    ('Rest', 9, 'rest')
  returning id, name
)
insert into time_activities (name, parent_id, sort, legacy_category)
select p.name, g.id, p.sort, p.legacy
from g join (values
  ('Work', 'Deep work', 1, 'deep_work'), ('Work', 'Meetings', 2, 'meetings'),
  ('Work', 'Admin / email', 3, 'admin'), ('Work', 'Reactive', 4, 'reactive'),
  ('Work', 'Procrastinating', 5, 'procrastinating'),
  ('Home', 'Housework', 1, null), ('Home', 'Cooking', 2, null), ('Home', 'Errands', 3, null),
  ('Downtime', 'Break', 1, null), ('Downtime', 'TV', 2, null),
  ('Downtime', 'Reading', 3, null), ('Downtime', 'Games', 4, null),
  ('Hockey', 'Playing', 1, null), ('Hockey', 'Umpiring', 2, null),
  ('Hockey', 'Socialising', 3, null), ('Hockey', 'Travel', 4, null),
  ('Golf', 'Playing', 1, null), ('Golf', 'Practice', 2, null), ('Golf', 'Socialising', 3, null),
  ('Exercise', 'Running', 1, null), ('Exercise', 'Gym', 2, null)
) as p(grp, name, sort, legacy) on p.grp = g.name;

-- Point older entries at their activity
update time_entries t set activity_id = a.id
from time_activities a where a.legacy_category = t.category and t.activity_id is null;
