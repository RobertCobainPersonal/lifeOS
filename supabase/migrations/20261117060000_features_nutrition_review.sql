-- Feature toggles, macros, calorie bands and weekly review. Additive only.
alter table settings
  add column if not exists features jsonb not null default '{}'::jsonb,
  add column if not exists kcal_bands jsonb,
  add column if not exists last_review_date date;

alter table food_entries
  add column if not exists carbs_g int not null default 0,
  add column if not exists fat_g int not null default 0;

alter table saved_meals
  add column if not exists carbs_g int not null default 0,
  add column if not exists fat_g int not null default 0;

alter table day_log
  add column if not exists day_type text check (day_type in ('rest','light','training','long'));
