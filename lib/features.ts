import { addDays } from '@/lib/dates'

/** Optional parts of LifeOS. Each is off until switched on in Settings. */
export const FEATURES = [
  {
    key: 'detailed_nutrition',
    label: 'Detailed nutrition',
    note: 'Carbs and fat on food entries, and a day type on Fuel that sets the calorie target.',
  },
  {
    key: 'weekly_review',
    label: 'Weekly review',
    note: 'A once-a-week screen: last week, each project, and choosing the focus project.',
  },
  {
    key: 'non_negotiables',
    label: 'Non-negotiables',
    note: 'A short list of daily ticks on Home.',
  },
  {
    key: 'sleep_line',
    label: 'Sleep and recovery',
    note: 'Last night’s sleep on Home and sleep against focus in Record. Needs the Health Shortcut.',
  },
  {
    key: 'week_ahead',
    label: 'Week ahead',
    note: 'The next seven days of meetings and free time. Needs the Calendar Shortcut to send a week.',
  },
  {
    key: 'people',
    label: 'Keeping in touch',
    note: 'A list of people and how often you want to be in touch, with a gentle nudge on Home.',
  },
] as const

export type FeatureKey = (typeof FEATURES)[number]['key']

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function isOn(features: unknown, key: FeatureKey): boolean {
  return asRecord(features)[key] === true
}

/** The stored features object with one feature switched. */
export function withFeature(features: unknown, key: FeatureKey, on: boolean): Record<string, unknown> {
  if (!FEATURES.some(f => f.key === key)) throw new Error('Unknown feature')
  return { ...asRecord(features), [key]: on }
}

/** A weekly review is due when none is recorded or the last was seven or more days ago. */
export function reviewDue(lastReviewDate: string | null, today: string): boolean {
  return lastReviewDate === null || lastReviewDate <= addDays(today, -7)
}
