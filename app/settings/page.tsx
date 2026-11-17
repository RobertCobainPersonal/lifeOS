import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SettingsForm from '@/components/SettingsForm'
import JournalPromptsForm from '@/components/JournalPromptsForm'
import TargetsForm from '@/components/TargetsForm'
import { DEFAULT_PROMPTS } from '@/lib/closeout'
import { FEATURES, isOn } from '@/lib/features'
import { resolveBands } from '@/lib/fuel'
import FeatureToggles from '@/components/FeatureToggles'
import BandsForm from '@/components/BandsForm'
import HabitsForm from '@/components/HabitsForm'
import ActivitiesForm from '@/components/ActivitiesForm'
import { labelOf, shortcutMenu } from '@/lib/activities'
import { getActivities } from '@/lib/time-store'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: settings } = await supabase
    .from('settings')
    .select('slipping_days, clickup_token_set, journal_prompts, default_kcal, default_protein, features, kcal_bands')
    .eq('id', 1)
    .single()

  const habits = isOn(settings?.features, 'non_negotiables')
    ? (await supabase.from('habits').select('id, name').eq('archived', false).order('sort')).data ?? []
    : null

  const acts = await getActivities(supabase)
  const archivedActs = [...acts.byId.values()]
    .filter(a => a.archived)
    .map(a => ({ id: a.id, name: labelOf(a.id, acts) }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const slippingDays = settings?.slipping_days ?? 5
  const hasClickUp = !!process.env.CLICKUP_API_TOKEN

  return (
    <div className="min-h-screen bg-paper text-ink max-w-lg mx-auto lg:max-w-3xl lg:box-content lg:pl-56 lg:pr-8">
      <div className="px-4 pt-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/today" className="text-muted active:text-ink-soft text-sm">
            ← Today
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
            Slipping threshold
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
            <p className="text-muted text-sm mb-3">
              Tasks appear in Slipping after this many days without any activity.
            </p>
            <SettingsForm currentDays={slippingDays} />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
            Daily targets
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
            <p className="text-muted text-sm mb-3">
              Shown on Home and Fuel. Changing them updates today as well.
            </p>
            <TargetsForm
              kcal={settings?.default_kcal ?? 2400}
              protein={settings?.default_protein ?? 160}
            />
          </div>
        </section>

        <section id="activities" className="mb-8 scroll-mt-6">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
            What you track time on
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-3">
            <p className="text-muted text-sm mb-1">
              Groups with optional parts. Archiving hides one from the list but keeps its past time.
            </p>
            <ActivitiesForm groups={shortcutMenu(acts)} archived={archivedActs} />
          </div>
        </section>

        {isOn(settings?.features, 'detailed_nutrition') && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
              Calories by day type
            </h2>
            <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
              <p className="text-muted text-sm mb-3">
                Choosing a day type on Fuel sets that day&rsquo;s calorie target to these.
              </p>
              <BandsForm bands={resolveBands(settings?.kcal_bands)} />
            </div>
          </section>
        )}

        {habits && (
          <section className="mb-8">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
              Non-negotiables
            </h2>
            <div className="bg-card ring-1 ring-line rounded-xl px-4 py-3">
              <p className="text-muted text-sm mb-1">Shown on Home as daily ticks. Up to seven.</p>
              <HabitsForm habits={habits} />
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
            Optional features
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-1">
            <FeatureToggles
              enabled={FEATURES.filter(f => isOn(settings?.features, f.key)).map(f => f.key)}
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
            Journal prompts
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
            <p className="text-muted text-sm mb-3">
              Asked when you close the day. One to three, all optional to answer.
            </p>
            <JournalPromptsForm
              current={
                Array.isArray(settings?.journal_prompts) ? settings.journal_prompts : DEFAULT_PROMPTS
              }
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
            Your data
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4">
            <p className="text-muted text-sm mb-3">
              Download everything in LifeOS as one file: tasks, projects, time, food, journal answers,
              health and calendar. Keep a copy somewhere other than this device.
            </p>
            <a
              href="/api/export"
              download
              className="inline-block px-4 py-2 bg-accent active:bg-accent-strong text-white text-sm font-medium rounded-lg"
            >
              Download my data
            </a>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 px-1">
            ClickUp
          </h2>
          <div className="bg-card ring-1 ring-line rounded-xl px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-ink text-sm font-medium">Work tasks</p>
              <p className="text-muted text-xs mt-0.5">
                {hasClickUp ? 'Personal API token configured' : 'CLICKUP_API_TOKEN not set'}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              hasClickUp
                ? 'bg-green-100 text-green-700'
                : 'bg-sunk text-muted'
            }`}>
              {hasClickUp ? 'Connected' : 'Not configured'}
            </span>
          </div>
          {hasClickUp && (
            <p className="text-faint text-xs mt-2 px-1">
              Syncs when you open the ClickUp page. To reconnect, update CLICKUP_API_TOKEN in your environment.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
