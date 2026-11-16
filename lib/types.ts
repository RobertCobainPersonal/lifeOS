export interface Capture {
  id: string
  raw_text: string
  source: 'manual' | 'share' | 'voice' | 'email' | null
  url: string | null
  created_at: string
  triaged_at: string | null
  triage_result: 'task' | 'someday' | 'done' | 'deleted' | null
}

export interface Task {
  id: string
  capture_id: string | null
  title: string
  domain: 'work' | 'personal' | null
  energy: 'deep' | 'admin' | null
  due_date: string | null
  status: 'open' | 'done' | 'someday' | 'deferred'
  is_top3: boolean
  top3_date: string | null
  deferred_by_reset: boolean
  last_touched_at: string
  completed_at: string | null
  created_at: string
}

export interface ClickupTask {
  clickup_id: string
  title: string | null
  status: string | null
  due_date: string | null
  url: string | null
  list_name: string | null
  pinned_top3_date: string | null
  synced_at: string | null
}

export interface Settings {
  id: number
  slipping_days: number
  clickup_token_set: boolean
  last_planned_date: string | null
  journal_prompts: string[]
  default_kcal: number
  default_protein: number
}

export type Category =
  | 'deep_work'
  | 'meetings'
  | 'admin'
  | 'reactive'
  | 'procrastinating'
  | 'personal_project'
  | 'learning'
  | 'rest'
  | 'exercise'

export interface DayLog {
  day: string
  one_thing_task_id: string | null
  one_thing_clickup_id: string | null
  kcal_target: number | null
  protein_target: number | null
  closeout: { prompts: string[]; answers: string[] } | null
  closed_at: string | null
}

export interface TimeEntry {
  id: string
  day: string
  mode: 'focus' | 'track'
  category: Category
  energy: number | null
  task_id: string | null
  clickup_id: string | null
  label: string | null
  planned_minutes: number | null
  started_at: string
  ended_at: string | null
  paused_at: string | null
  paused_seconds: number
  distractions: number
  done_note: string | null
  next_note: string | null
}

export interface SavedMeal {
  id: string
  name: string
  kcal: number
  protein_g: number
  use_count: number
}

export interface FoodEntry {
  id: string
  day: string
  label: string
  kcal: number
  protein_g: number
  meal_id: string | null
  created_at: string
}

export interface Activity {
  source: string
  source_id: string
  started_at: string
  day: string
  type: string | null
  distance_m: number | null
  moving_seconds: number | null
  avg_hr: number | null
  kcal: number | null
}

export interface DailyHealth {
  day: string
  sleep_minutes: number | null
  resting_hr: number | null
  hrv: number | null
}
