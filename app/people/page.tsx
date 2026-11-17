import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { londonToday } from '@/lib/dates'
import { isOn } from '@/lib/features'
import { cadenceLabel, dueList, sinceLabel, type Person } from '@/lib/people'
import BottomNav from '@/components/BottomNav'
import AddPersonForm from '@/components/AddPersonForm'
import PersonRow from '@/components/PersonRow'

export default async function PeoplePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const today = londonToday()
  const [settings, peopleResult, inbox] = await Promise.all([
    supabase.from('settings').select('features').eq('id', 1).single(),
    supabase
      .from('people')
      .select('id, name, cadence_days, last_contact, note, created_at')
      .eq('archived', false)
      .order('name'),
    supabase.from('captures').select('*', { count: 'exact', head: true }).is('triaged_at', null),
  ])
  if (!isOn(settings.data?.features, 'people')) redirect('/settings')

  const people = (peopleResult.data ?? []) as Person[]
  const due = dueList(people, today)
  const dueIds = new Set(due.map(p => p.id))
  const rest = people.filter(p => !dueIds.has(p.id))

  const row = (p: Person) => (
    <PersonRow
      key={p.id}
      id={p.id}
      name={p.name}
      rhythm={cadenceLabel(p.cadence_days)}
      since={sinceLabel(p.last_contact, today)}
      note={p.note}
    />
  )

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-3xl lg:box-content lg:pl-56 lg:pr-8">
      <div className="px-4 pt-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/more" className="text-muted active:text-ink-soft text-sm">
            ← More
          </Link>
          <h1 className="text-2xl font-bold">Keeping in touch</h1>
        </div>

        {people.length === 0 && (
          <p className="text-muted text-sm px-1">
            Add a few people and how often you&rsquo;d like to be in touch. Start small: three is plenty.
          </p>
        )}

        {due.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              Worth a hello
            </h2>
            <div className="bg-card ring-1 ring-line rounded-xl px-4">{due.map(row)}</div>
          </section>
        )}

        {rest.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 px-1">
              Recently in touch
            </h2>
            <div className="bg-card ring-1 ring-line rounded-xl px-4">{rest.map(row)}</div>
          </section>
        )}

        <AddPersonForm />
      </div>
      <BottomNav current="more" inboxCount={inbox.count ?? 0} />
    </div>
  )
}
