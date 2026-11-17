/** What time is tracked against: groups (Work, Hockey…) with optional parts (Playing, Socialising…). */
export interface Activity {
  id: string
  name: string
  parent_id: string | null
  sort: number
  archived: boolean
  legacy_category: string | null
}

export interface ActivityIndex {
  byId: Map<string, Activity>
  /** Live top-level activities, in order. */
  groups: Activity[]
  /** Live parts of a group, in order. */
  partsOf: (groupId: string) => Activity[]
  byLegacy: Map<string, Activity>
}

const bySort = (x: Activity, y: Activity) => x.sort - y.sort || x.name.localeCompare(y.name)

export function indexActivities(list: Activity[]): ActivityIndex {
  const byId = new Map(list.map(x => [x.id, x]))
  const byLegacy = new Map(list.filter(x => x.legacy_category).map(x => [x.legacy_category as string, x]))
  const groups = list.filter(x => x.parent_id === null && !x.archived).sort(bySort)
  const parts = new Map<string, Activity[]>()
  for (const x of list) {
    if (x.parent_id === null || x.archived) continue
    parts.set(x.parent_id, [...(parts.get(x.parent_id) ?? []), x])
  }
  for (const v of parts.values()) v.sort(bySort)
  return { byId, groups, partsOf: id => parts.get(id) ?? [], byLegacy }
}

/** "Hockey · Playing", "Learning", or "Other". */
export function labelOf(id: string | null, idx: ActivityIndex): string {
  const x = id ? idx.byId.get(id) : undefined
  if (!x) return 'Other'
  const parent = x.parent_id ? idx.byId.get(x.parent_id) : undefined
  return parent ? `${parent.name} · ${x.name}` : x.name
}

/** The part's own name, or the group's. */
export function shortName(id: string | null, idx: ActivityIndex): string {
  return (id && idx.byId.get(id)?.name) || 'Other'
}

/**
 * Which activity an entry counts towards, and its group. Older entries are
 * mapped by their category; one that maps to nothing keeps its category as a key.
 */
export function resolveEntry(
  entry: { activity_id: string | null; category: string | null },
  idx: ActivityIndex
): { id: string; group: string } {
  const x = (entry.activity_id && idx.byId.get(entry.activity_id)) ||
    (entry.category ? idx.byLegacy.get(entry.category) : undefined)
  if (!x) {
    const key = entry.activity_id ?? entry.category ?? 'other'
    return { id: key, group: key }
  }
  return { id: x.id, group: x.parent_id ?? x.id }
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/**
 * Find a live activity from what a Shortcut sends: an id, "Group/Part",
 * a name that is unique, or an older category key.
 */
export function findActivity(ref: string, idx: ActivityIndex): Activity | null {
  const live = (x: Activity | undefined) => {
    if (!x || x.archived) return null
    const parent = x.parent_id ? idx.byId.get(x.parent_id) : undefined
    return parent?.archived ? null : x
  }
  const byId = live(idx.byId.get(ref))
  if (byId) return byId

  if (ref.includes('/')) {
    // Split at the first slash only: a part such as "Admin / email" may contain one
    const cut = ref.indexOf('/')
    const g = norm(ref.slice(0, cut))
    const p = norm(ref.slice(cut + 1))
    const group = idx.groups.find(x => norm(x.name) === g)
    return group ? (idx.partsOf(group.id).find(x => norm(x.name) === p) ?? null) : null
  }

  const all = [...idx.groups, ...idx.groups.flatMap(g => idx.partsOf(g.id))]
  const named = all.filter(x => norm(x.name) === norm(ref))
  if (named.length === 1) return named[0]
  if (named.length > 1) return null

  return live(idx.byLegacy.get(ref.trim()))
}

export function parseActivityName(
  raw: string,
  siblings: string[]
): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, 40)
  if (name === '') return { ok: false, error: 'Give it a name' }
  if (name.includes('/')) return { ok: false, error: 'Leave out the slash' }
  if (siblings.some(s => norm(s) === norm(name))) return { ok: false, error: 'That name is already there' }
  return { ok: true, name }
}

/** The list a phone Shortcut shows: live groups and their live parts. */
export function shortcutMenu(idx: ActivityIndex): { id: string; name: string; parts: { id: string; name: string }[] }[] {
  return idx.groups.map(g => ({
    id: g.id,
    name: g.name,
    parts: idx.partsOf(g.id).map(p => ({ id: p.id, name: p.name })),
  }))
}

export const STOP_CHOICE = 'Stop tracking'

/** Flat list for a phone menu: stop first, then each group followed by its parts. */
export function shortcutOptions(idx: ActivityIndex): string[] {
  return [
    STOP_CHOICE,
    ...idx.groups.flatMap(g => [g.name, ...idx.partsOf(g.id).map(p => `${g.name} / ${p.name}`)]),
  ]
}

export interface GroupBreakdown {
  id: string
  name: string
  minutes: number
  parts: { name: string; minutes: number }[]
}

/**
 * Groups by time, each with its parts by time. Time tracked against the group
 * itself shows as a part named after the group, but only when it has other parts.
 */
export function breakdown(
  byGroup: Record<string, number>,
  byActivity: Record<string, number>,
  idx: ActivityIndex
): GroupBreakdown[] {
  return Object.entries(byGroup)
    .sort((a, b) => b[1] - a[1])
    .map(([id, minutes]) => {
      const parts = Object.entries(byActivity)
        .filter(([aid]) => aid === id || idx.byId.get(aid)?.parent_id === id)
        .map(([aid, m]) => ({ name: shortName(aid, idx) === 'Other' ? aid : shortName(aid, idx), minutes: m }))
        .sort((a, b) => b.minutes - a.minutes)
      const onlyItself = parts.length === 1 && parts[0].name === (idx.byId.get(id)?.name ?? id)
      return { id, name: idx.byId.get(id)?.name ?? id, minutes, parts: onlyItself || parts.length === 0 ? [] : parts }
    })
}

/** Key functions for summaries: by group, or by the exact activity. */
export function groupKey(idx: ActivityIndex) {
  return (e: { activity_id: string | null; category: string | null }) => resolveEntry(e, idx).group
}
export function activityKey(idx: ActivityIndex) {
  return (e: { activity_id: string | null; category: string | null }) => resolveEntry(e, idx).id
}

/** New sort numbers after moving one sibling up (-1) or down (+1); null if it cannot move. */
export function reorder(
  siblings: { id: string; sort: number }[],
  id: string,
  dir: -1 | 1
): { id: string; sort: number }[] | null {
  const ordered = [...siblings].sort((a, b) => a.sort - b.sort)
  const i = ordered.findIndex(s => s.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= ordered.length) return null
  ;[ordered[i], ordered[j]] = [ordered[j], ordered[i]]
  return ordered.map((s, n) => ({ id: s.id, sort: n + 1 }))
}
