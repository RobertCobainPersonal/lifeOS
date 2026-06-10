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
}
