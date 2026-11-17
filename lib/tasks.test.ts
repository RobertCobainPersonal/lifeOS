import { describe, expect, it } from 'vitest'
import { parseNewTask } from './tasks'

describe('parseNewTask', () => {
  it('accepts a title with the defaults', () => {
    expect(parseNewTask({ title: '  Call the bank ', domain: 'work', energy: '', dueDate: '' })).toEqual({
      ok: true,
      title: 'Call the bank',
      domain: 'work',
      energy: null,
      due_date: null,
    })
  })
  it('keeps energy and a due date when given', () => {
    expect(
      parseNewTask({ title: 'Draft CV', domain: 'personal', energy: 'deep', dueDate: '2026-11-20' })
    ).toMatchObject({ ok: true, domain: 'personal', energy: 'deep', due_date: '2026-11-20' })
  })
  it('allows a due date in the past, since it may already be late', () => {
    expect(parseNewTask({ title: 'x', domain: 'work', energy: '', dueDate: '2026-11-10' }).ok).toBe(true)
  })
  it('rejects a blank title', () => {
    expect(parseNewTask({ title: '   ', domain: 'work', energy: '', dueDate: '' })).toEqual({
      ok: false,
      error: 'Give the task a name',
    })
  })
  it('rejects an unknown area or energy', () => {
    expect(parseNewTask({ title: 'x', domain: 'hobby', energy: '', dueDate: '' }).ok).toBe(false)
    expect(parseNewTask({ title: 'x', domain: 'work', energy: 'medium', dueDate: '' }).ok).toBe(false)
  })
  it('rejects a date that is not a real day', () => {
    expect(parseNewTask({ title: 'x', domain: 'work', energy: '', dueDate: '2026-02-30' }).ok).toBe(false)
    expect(parseNewTask({ title: 'x', domain: 'work', energy: '', dueDate: '20/11/2026' }).ok).toBe(false)
  })
  it('caps a very long title', () => {
    const r = parseNewTask({ title: 'a'.repeat(400), domain: 'work', energy: '', dueDate: '' })
    expect(r.ok && r.title.length).toBe(200)
  })
})
