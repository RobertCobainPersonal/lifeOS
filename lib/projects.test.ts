import { describe, expect, it } from 'vitest'
import { bandCounts, isLoose, lastTouched, nextAction, parseProjectTask, planCandidates, touchedLabel } from './projects'

let n = 0
const task = (over: object = {}) => ({
  id: `t${n++}`,
  title: 'Task',
  status: 'open',
  project_id: 'p1' as string | null,
  band: 'now' as 'now' | 'next' | 'later' | null,
  project_sort: 0 as number | null,
  last_touched_at: '2026-11-10T09:00:00Z',
  completed_at: null as string | null,
  created_at: '2026-11-01T09:00:00Z',
  ...over,
})

describe('isLoose', () => {
  it('is true for a task with no project', () => {
    expect(isLoose(task({ project_id: null, band: null }))).toBe(true)
  })
  it('is false for any project task, whatever its band', () => {
    expect(isLoose(task({ band: 'now' }))).toBe(false)
    expect(isLoose(task({ band: 'later' }))).toBe(false)
  })
})

describe('nextAction', () => {
  it('is the first open Now task in list order', () => {
    const tasks = [
      task({ title: 'Second', project_sort: 2 }),
      task({ title: 'First', project_sort: 1 }),
      task({ title: 'Queued', band: 'next', project_sort: 0 }),
    ]
    expect(nextAction(tasks)?.title).toBe('First')
  })
  it('skips completed tasks', () => {
    const tasks = [task({ title: 'Done', status: 'done', project_sort: 1 }), task({ title: 'Open', project_sort: 2 })]
    expect(nextAction(tasks)?.title).toBe('Open')
  })
  it('falls back to creation order when list order is missing', () => {
    const tasks = [
      task({ title: 'Newer', project_sort: null, created_at: '2026-11-05T09:00:00Z' }),
      task({ title: 'Older', project_sort: null, created_at: '2026-11-02T09:00:00Z' }),
    ]
    expect(nextAction(tasks)?.title).toBe('Older')
  })
  it('is null when nothing is in Now, even if Next has items', () => {
    expect(nextAction([task({ band: 'next' }), task({ band: 'later' })])).toBeNull()
  })
})

describe('bandCounts', () => {
  it('counts open tasks per band and ignores done ones', () => {
    const tasks = [task(), task(), task({ band: 'next' }), task({ band: 'later' }), task({ band: 'later', status: 'done' })]
    expect(bandCounts(tasks)).toEqual({ now: 2, next: 1, later: 1 })
  })
})

describe('lastTouched', () => {
  it('is the most recent touch or completion across the project', () => {
    const tasks = [
      task({ last_touched_at: '2026-11-10T09:00:00Z' }),
      task({ status: 'done', last_touched_at: '2026-11-01T09:00:00Z', completed_at: '2026-11-14T18:00:00Z' }),
    ]
    expect(lastTouched(tasks)).toBe('2026-11-14T18:00:00Z')
  })
  it('is null for an empty project', () => {
    expect(lastTouched([])).toBeNull()
  })
})

describe('planCandidates', () => {
  const projects = [
    { id: 'p1', name: 'PennyPath', is_focus: false, archived: false },
    { id: 'p2', name: 'ParkPilot', is_focus: true, archived: false },
    { id: 'p3', name: 'Fancy', is_focus: false, archived: false },
    { id: 'p4', name: 'Old thing', is_focus: false, archived: true },
  ]
  const tasks = [
    task({ project_id: 'p1', title: 'Export a backup', project_sort: 1 }),
    task({ project_id: 'p1', title: 'Install build', project_sort: 2 }),
    task({ project_id: 'p2', title: 'Re-run UI tests', project_sort: 1 }),
    task({ project_id: 'p3', title: 'Model a collection', band: 'next' }),
    task({ project_id: 'p4', title: 'Archived work', project_sort: 1 }),
  ]
  it('offers one next action per project, focus project first', () => {
    expect(planCandidates(projects, tasks).map(c => [c.projectName, c.task.title])).toEqual([
      ['ParkPilot', 'Re-run UI tests'],
      ['PennyPath', 'Export a backup'],
    ])
  })
  it('leaves out projects with nothing in Now and archived projects', () => {
    const names = planCandidates(projects, tasks).map(c => c.projectName)
    expect(names).not.toContain('Fancy')
    expect(names).not.toContain('Old thing')
  })
})

describe('parseProjectTask', () => {
  it('accepts a title and band', () => {
    expect(parseProjectTask({ title: '  Design the icon ', band: 'next' })).toEqual({
      ok: true,
      title: 'Design the icon',
      band: 'next',
    })
  })
  it('rejects a blank title', () => {
    expect(parseProjectTask({ title: '   ', band: 'now' }).ok).toBe(false)
  })
  it('rejects an unknown band', () => {
    expect(parseProjectTask({ title: 'x', band: 'soon' }).ok).toBe(false)
  })
})

describe('touchedLabel', () => {
  const now = new Date('2026-11-16T20:00:00Z')
  it('says not started for a project with no activity', () => {
    expect(touchedLabel(null, now)).toBe('Not started')
  })
  it('names recent days plainly', () => {
    expect(touchedLabel('2026-11-16T09:00:00Z', now)).toBe('Touched today')
    expect(touchedLabel('2026-11-15T19:00:00Z', now)).toBe('Touched yesterday')
    expect(touchedLabel('2026-11-11T09:00:00Z', now)).toBe('Touched 5 days ago')
  })
  it('gives a date after a fortnight, with no warning words', () => {
    const label = touchedLabel('2026-10-20T09:00:00Z', now)
    expect(label).toBe('Touched 20 Oct')
    expect(label).not.toMatch(/overdue|stale|slipping|neglect/i)
  })
})
