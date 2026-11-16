import { describe, expect, it } from 'vitest'
import { resolveOneThing } from './onething'

const tasks = [
  { id: 't1', title: 'Draft CV summary', status: 'open' },
  { id: 't2', title: 'Book physio', status: 'done' },
]
const clickup = [{ clickup_id: 'c1', title: 'Send data pack' }]
const log = (over: object) => ({ one_thing_task_id: null, one_thing_clickup_id: null, ...over })

describe('resolveOneThing', () => {
  it('is none when no log exists', () => {
    expect(resolveOneThing(null, tasks, clickup)).toEqual({ state: 'none' })
  })
  it('is none when nothing is chosen', () => {
    expect(resolveOneThing(log({}), tasks, clickup)).toEqual({ state: 'none' })
  })
  it('is open for an open local task', () => {
    expect(resolveOneThing(log({ one_thing_task_id: 't1' }), tasks, clickup)).toEqual({
      state: 'open', kind: 'task', id: 't1', title: 'Draft CV summary',
    })
  })
  it('is done once the task is completed', () => {
    expect(resolveOneThing(log({ one_thing_task_id: 't2' }), tasks, clickup)).toEqual({
      state: 'done', kind: 'task', id: 't2', title: 'Book physio',
    })
  })
  it.each(['someday', 'deferred'])('is done, not open, once the task is moved to %s', status => {
    const parked = [{ id: 't9', title: 'Parked', status }]
    expect(resolveOneThing(log({ one_thing_task_id: 't9' }), parked, clickup)).toMatchObject({
      state: 'done',
      id: 't9',
    })
  })
  it('is none when the task no longer exists', () => {
    expect(resolveOneThing(log({ one_thing_task_id: 'gone' }), tasks, clickup)).toEqual({ state: 'none' })
  })
  it('resolves a pinned work item', () => {
    expect(resolveOneThing(log({ one_thing_clickup_id: 'c1' }), tasks, clickup)).toEqual({
      state: 'open', kind: 'clickup', id: 'c1', title: 'Send data pack',
    })
  })
  it('is none when the work item is no longer in the mirror', () => {
    expect(resolveOneThing(log({ one_thing_clickup_id: 'zz' }), tasks, clickup)).toEqual({ state: 'none' })
  })
})
