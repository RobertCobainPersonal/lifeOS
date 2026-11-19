import { describe, expect, it } from 'vitest'
import { asText, groupByDay, parseDoneBody, splitDone } from './done'

describe('splitDone', () => {
  it('keeps a single line, trimmed', () => {
    expect(splitDone('  Sent the coverage summary to Marc ')).toEqual(['Sent the coverage summary to Marc'])
  })
  it('drops a spoken "Done" prefix', () => {
    expect(splitDone('Done: fixed the Magnus import')).toEqual(['fixed the Magnus import'])
    expect(splitDone('done - fixed it')).toEqual(['fixed it'])
    expect(splitDone('Done fixed it')).toEqual(['Done fixed it'])
  })
  it('splits a dictated list into one item per line, without bullets or numbers', () => {
    expect(splitDone('- Glossary draft\n• Pipeline runbook\n\n2. Called Lee\n* Reviewed PR')).toEqual([
      'Glossary draft',
      'Pipeline runbook',
      'Called Lee',
      'Reviewed PR',
    ])
  })
  it('caps each item at 500 characters and the list at 30 items', () => {
    expect(splitDone('x'.repeat(600))[0]).toHaveLength(500)
    expect(splitDone(Array.from({ length: 40 }, (_, i) => `item ${i}`).join('\n'))).toHaveLength(30)
  })
  it('gives nothing for blank input', () => {
    expect(splitDone(' \n - \n')).toEqual([])
  })
})

describe('parseDoneBody', () => {
  const today = '2026-11-19'
  it('files under today by default', () => {
    expect(parseDoneBody({ text: 'Shipped it' }, today)).toEqual({ ok: true, day: today, items: ['Shipped it'] })
  })
  it('accepts an earlier day to fill in a missed one', () => {
    expect(parseDoneBody({ text: 'Big day', day: '2026-11-18' }, today)).toMatchObject({ ok: true, day: '2026-11-18' })
  })
  it('refuses a future day, a day over 30 days back, or a non-date', () => {
    for (const day of ['2026-11-20', '2026-10-19', '19/11/2026', '2026-02-30'])
      expect(parseDoneBody({ text: 'x', day }, today).ok).toBe(false)
  })
  it('refuses missing or blank text', () => {
    expect(parseDoneBody({}, today).ok).toBe(false)
    expect(parseDoneBody({ text: ' - ' }, today).ok).toBe(false)
    expect(parseDoneBody(null, today).ok).toBe(false)
  })
})

describe('groupByDay', () => {
  it('groups newest day first, keeping order within a day', () => {
    const rows = [
      { id: '1', day: '2026-11-18', text: 'a', created_at: '2026-11-18T09:00:00Z' },
      { id: '2', day: '2026-11-19', text: 'b', created_at: '2026-11-19T09:00:00Z' },
      { id: '3', day: '2026-11-18', text: 'c', created_at: '2026-11-18T10:00:00Z' },
    ]
    expect(groupByDay(rows).map(g => [g.day, g.items.map(i => i.text)])).toEqual([
      ['2026-11-19', ['b']],
      ['2026-11-18', ['a', 'c']],
    ])
  })
})

describe('asText', () => {
  it('writes days as headings with a bullet per item, ready to paste', () => {
    const groups = [
      { day: '2026-11-19', items: [{ text: 'Glossary draft' }, { text: 'Called Lee' }] },
      { day: '2026-11-18', items: [{ text: 'Runbook' }] },
    ]
    expect(asText(groups)).toBe('Thu 19 Nov\n- Glossary draft\n- Called Lee\n\nWed 18 Nov\n- Runbook')
  })
})
