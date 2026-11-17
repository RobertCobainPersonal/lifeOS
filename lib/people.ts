import { addDays, londonDate } from '@/lib/dates'

export interface Person {
  id: string
  name: string
  cadence_days: number
  last_contact: string | null
  note: string | null
  created_at: string
}

/** How often to be in touch. */
export const CADENCES = [
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Fortnightly' },
  { days: 30, label: 'Monthly' },
  { days: 90, label: 'Quarterly' },
  { days: 180, label: 'Twice a year' },
]

export function cadenceLabel(days: number): string {
  return CADENCES.find(c => c.days === days)?.label ?? `Every ${days} days`
}

export function parsePerson(
  raw: { name: string; cadence: string },
  existing: string[]
): { ok: true; name: string; cadence_days: number } | { ok: false; error: string } {
  const name = raw.name.trim().slice(0, 80)
  if (name === '') return { ok: false, error: 'Add a name' }
  if (existing.some(e => e.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: 'They are already on the list' }
  }
  const cadence_days = Number(raw.cadence)
  if (!CADENCES.some(c => c.days === cadence_days)) return { ok: false, error: 'Choose how often' }
  return { ok: true, name, cadence_days }
}

/** The day their rhythm next comes round. */
export function nextDue(p: Pick<Person, 'last_contact' | 'cadence_days' | 'created_at'>): string {
  return p.last_contact ? addDays(p.last_contact, p.cadence_days) : londonDate(new Date(p.created_at))
}

/** People whose rhythm has come round, longest wait first; never-contacted first of all. */
export function dueList<T extends Pick<Person, 'last_contact' | 'cadence_days' | 'created_at'>>(
  people: T[],
  today: string
): T[] {
  return people
    .filter(p => nextDue(p) <= today)
    .sort((a, b) => (a.last_contact ?? '').localeCompare(b.last_contact ?? ''))
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000
  )
}

/** "5 days ago", "3 weeks ago", "Not yet". Describes; never scolds. */
export function sinceLabel(lastContact: string | null, today: string): string {
  if (!lastContact) return 'Not yet'
  const days = daysBetween(lastContact, today)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
