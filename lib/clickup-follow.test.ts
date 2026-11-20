import { describe, expect, it } from 'vitest'
import { listProgress, mapTask, parseListRef, parseTaskRef, type ApiTask } from './clickup-follow'

describe('parseTaskRef', () => {
  it('reads a task link', () => {
    expect(parseTaskRef('https://app.clickup.com/t/86c1abcde')).toEqual({ id: '86c1abcde', custom: false })
  })
  it('reads a task link with the workspace in it', () => {
    expect(parseTaskRef('https://app.clickup.com/t/9015123456/86c1abcde')).toEqual({ id: '86c1abcde', custom: false })
  })
  it('reads a bare id, and a custom id such as MIS-123', () => {
    expect(parseTaskRef(' 86c1abcde ')).toEqual({ id: '86c1abcde', custom: false })
    expect(parseTaskRef('MIS-123')).toEqual({ id: 'MIS-123', custom: true })
    expect(parseTaskRef('https://app.clickup.com/t/9015123456/MIS-123')).toEqual({ id: 'MIS-123', custom: true })
  })
  it('refuses anything else', () => {
    for (const s of ['', 'hello world', 'https://example.com/t/abc', 'https://app.clickup.com/9015/v/li/901'])
      expect(parseTaskRef(s)).toBeNull()
  })
})

describe('parseListRef', () => {
  it('reads a list link or a bare list id', () => {
    expect(parseListRef('https://app.clickup.com/9015123456/v/li/901512345678')).toBe('901512345678')
    expect(parseListRef('https://app.clickup.com/9015123456/v/l/li/901512345678?pr=1')).toBe('901512345678')
    expect(parseListRef('901512345678')).toBe('901512345678')
  })
  it('refuses a task link or text', () => {
    expect(parseListRef('https://app.clickup.com/t/86c1abcde')).toBeNull()
    expect(parseListRef('Projects')).toBeNull()
  })
})

const raw = (over: Partial<ApiTask> = {}): ApiTask => ({
  id: 't1',
  name: 'Write glossary',
  status: { status: 'in progress', type: 'custom' },
  due_date: String(Date.parse('2026-11-21T12:00:00Z')),
  url: 'https://app.clickup.com/t/t1',
  list: { id: 'l1', name: 'OMIS Docs' },
  assignees: [{ id: 7, username: 'Rob Cobain' }, { id: 9, username: 'Abbie' }],
  ...over,
})
const now = new Date('2026-11-20T10:00:00Z')

describe('mapTask', () => {
  it('maps the fields LifeOS keeps', () => {
    expect(mapTask(raw(), 7, now)).toEqual({
      clickup_id: 't1',
      title: 'Write glossary',
      status: 'in progress',
      due_date: '2026-11-21',
      url: 'https://app.clickup.com/t/t1',
      list_id: 'l1',
      list_name: 'OMIS Docs',
      mine: true,
      assignees: ['Rob Cobain', 'Abbie'],
      synced_at: now.toISOString(),
    })
  })
  it('knows a task that is not yours, with no due date', () => {
    expect(mapTask(raw({ assignees: [{ id: 9, username: 'Abbie' }], due_date: null }), 7, now)).toMatchObject({
      mine: false,
      due_date: null,
    })
  })
})

describe('listProgress', () => {
  it('counts done, open, overdue and due this week', () => {
    const tasks = [
      raw({ id: 'a', status: { status: 'complete', type: 'closed' } }),
      raw({ id: 'b', status: { status: 'done', type: 'done' } }),
      raw({ id: 'c', due_date: String(Date.parse('2026-11-18T12:00:00Z')) }),
      raw({ id: 'd' }),
      raw({ id: 'e', due_date: null }),
    ]
    expect(listProgress(tasks, '2026-11-20')).toEqual({ total: 5, closed: 2, overdue: 1, dueThisWeek: 1 })
  })
})
