import { describe, expect, it } from 'vitest'
import {
  findActivity,
  indexActivities,
  labelOf,
  parseActivityName,
  resolveEntry,
  shortcutMenu,
  shortcutOptions,
  breakdown,
  reorder,
  type Activity,
} from './activities'

const a = (id: string, name: string, parent_id: string | null = null, over: Partial<Activity> = {}): Activity => ({
  id,
  name,
  parent_id,
  sort: 0,
  archived: false,
  legacy_category: null,
  ...over,
})

const list: Activity[] = [
  a('work', 'Work', null, { sort: 1 }),
  a('deep', 'Deep work', 'work', { sort: 1, legacy_category: 'deep_work' }),
  a('meet', 'Meetings', 'work', { sort: 2, legacy_category: 'meetings' }),
  a('proc', 'Procrastinating', 'work', { sort: 5, legacy_category: 'procrastinating' }),
  a('hockey', 'Hockey', null, { sort: 4 }),
  a('h-play', 'Playing', 'hockey', { sort: 1 }),
  a('h-soc', 'Socialising', 'hockey', { sort: 3 }),
  a('golf', 'Golf', null, { sort: 5 }),
  a('g-play', 'Playing', 'golf', { sort: 1 }),
  a('learn', 'Learning', null, { sort: 8, legacy_category: 'learning' }),
  a('old', 'Old thing', null, { sort: 9, archived: true }),
  a('h-old', 'Coaching', 'hockey', { sort: 9, archived: true }),
]
const idx = indexActivities(list)

describe('indexActivities', () => {
  it('lists live groups in order with their live parts', () => {
    expect(idx.groups.map(g => g.name)).toEqual(['Work', 'Hockey', 'Golf', 'Learning'])
    expect(idx.partsOf('hockey').map(p => p.name)).toEqual(['Playing', 'Socialising'])
    expect(idx.partsOf('learn')).toEqual([])
  })
  it('still knows archived activities, so old entries keep their names', () => {
    expect(labelOf('h-old', idx)).toBe('Hockey · Coaching')
  })
})

describe('labelOf', () => {
  it('names a part with its group', () => {
    expect(labelOf('h-play', idx)).toBe('Hockey · Playing')
  })
  it('names a group or stand-alone activity on its own', () => {
    expect(labelOf('hockey', idx)).toBe('Hockey')
    expect(labelOf('learn', idx)).toBe('Learning')
  })
  it('falls back for something unknown', () => {
    expect(labelOf('nope', idx)).toBe('Other')
    expect(labelOf(null, idx)).toBe('Other')
  })
})

describe('resolveEntry', () => {
  it('uses the activity when the entry has one', () => {
    expect(resolveEntry({ activity_id: 'h-soc', category: null }, idx)).toEqual({ id: 'h-soc', group: 'hockey' })
  })
  it('maps an older entry by its category', () => {
    expect(resolveEntry({ activity_id: null, category: 'meetings' }, idx)).toEqual({ id: 'meet', group: 'work' })
  })
  it('treats a group-level entry as its own group', () => {
    expect(resolveEntry({ activity_id: 'hockey', category: null }, idx)).toEqual({ id: 'hockey', group: 'hockey' })
  })
  it('keeps an unmapped older category as its own key', () => {
    expect(resolveEntry({ activity_id: null, category: 'rest' }, idx)).toEqual({ id: 'rest', group: 'rest' })
  })
})

describe('findActivity', () => {
  it('finds by id', () => {
    expect(findActivity('h-play', idx)?.id).toBe('h-play')
  })
  it('finds by Group/Part path, ignoring case and spaces', () => {
    expect(findActivity(' hockey / socialising ', idx)?.id).toBe('h-soc')
  })
  it('finds a part whose own name has a slash', () => {
    const withSlash = indexActivities([...list, a('admin', 'Admin / email', 'work', { sort: 3 })])
    expect(findActivity('Work / Admin / email', withSlash)?.id).toBe('admin')
  })
  it('finds a unique name', () => {
    expect(findActivity('meetings', idx)?.id).toBe('meet')
  })
  it('refuses an ambiguous name', () => {
    expect(findActivity('Playing', idx)).toBeNull()
  })
  it('finds by an older category key', () => {
    expect(findActivity('deep_work', idx)?.id).toBe('deep')
  })
  it('does not offer archived activities for new entries', () => {
    expect(findActivity('old', idx)).toBeNull()
    expect(findActivity('Old thing', idx)).toBeNull()
  })
})

describe('parseActivityName', () => {
  it('trims the name', () => {
    expect(parseActivityName('  Cooking ', ['Housework'])).toEqual({ ok: true, name: 'Cooking' })
  })
  it('rejects blank, duplicate (any case) or slash names', () => {
    expect(parseActivityName('  ', []).ok).toBe(false)
    expect(parseActivityName('housework', ['Housework']).ok).toBe(false)
    expect(parseActivityName('TV/Film', []).ok).toBe(false)
  })
})

describe('shortcutMenu', () => {
  it('gives the phone the live groups and parts', () => {
    expect(shortcutMenu(idx)).toEqual([
      { id: 'work', name: 'Work', parts: [
        { id: 'deep', name: 'Deep work' },
        { id: 'meet', name: 'Meetings' },
        { id: 'proc', name: 'Procrastinating' },
      ] },
      { id: 'hockey', name: 'Hockey', parts: [
        { id: 'h-play', name: 'Playing' },
        { id: 'h-soc', name: 'Socialising' },
      ] },
      { id: 'golf', name: 'Golf', parts: [{ id: 'g-play', name: 'Playing' }] },
      { id: 'learn', name: 'Learning', parts: [] },
    ])
  })
})

describe('shortcutOptions', () => {
  it('lists stop first, then each group followed by its parts', () => {
    expect(shortcutOptions(idx)).toEqual([
      'Stop tracking',
      'Work', 'Work / Deep work', 'Work / Meetings', 'Work / Procrastinating',
      'Hockey', 'Hockey / Playing', 'Hockey / Socialising',
      'Golf', 'Golf / Playing',
      'Learning',
    ])
  })
  it('every option finds its activity', () => {
    for (const option of shortcutOptions(idx).slice(1)) expect(findActivity(option, idx)).not.toBeNull()
  })
})

describe('breakdown', () => {
  it('lists groups by time, with their parts by time', () => {
    const byGroup = { hockey: 180, work: 200 }
    const byActivity = { 'h-play': 80, 'h-soc': 100, deep: 150, work: 50 }
    expect(breakdown(byGroup, byActivity, idx)).toEqual([
      { id: 'work', name: 'Work', minutes: 200, parts: [{ name: 'Deep work', minutes: 150 }, { name: 'Work', minutes: 50 }] },
      { id: 'hockey', name: 'Hockey', minutes: 180, parts: [{ name: 'Socialising', minutes: 100 }, { name: 'Playing', minutes: 80 }] },
    ])
  })
  it('shows no parts for a group tracked only as itself', () => {
    expect(breakdown({ learn: 30 }, { learn: 30 }, idx)).toEqual([
      { id: 'learn', name: 'Learning', minutes: 30, parts: [] },
    ])
  })
})

describe('reorder', () => {
  const sibs = [{ id: 'a', sort: 1 }, { id: 'b', sort: 2 }, { id: 'c', sort: 5 }]
  it('moves one up by swapping with its neighbour, renumbering cleanly', () => {
    expect(reorder(sibs, 'c', -1)).toEqual([{ id: 'a', sort: 1 }, { id: 'c', sort: 2 }, { id: 'b', sort: 3 }])
  })
  it('moves one down', () => {
    expect(reorder(sibs, 'a', 1)).toEqual([{ id: 'b', sort: 1 }, { id: 'a', sort: 2 }, { id: 'c', sort: 3 }])
  })
  it('does nothing past either end or for an unknown id', () => {
    expect(reorder(sibs, 'a', -1)).toBeNull()
    expect(reorder(sibs, 'c', 1)).toBeNull()
    expect(reorder(sibs, 'zz', 1)).toBeNull()
  })
})
