import { describe, expect, it } from 'vitest'
import {
  freeGaps,
  formatGap,
  londonClock,
  londonTimeIso,
  meetingMinutes,
  nextEvent,
  parseCalendarPayload,
  parseManualEvent,
  type CalendarEvent,
} from './calendar'

const ev = (start: string, end: string, over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  source: 'shortcut',
  source_id: `${start}|x`,
  day: start.slice(0, 10),
  starts_at: start,
  ends_at: end,
  all_day: false,
  title: 'Meeting',
  location: null,
  calendar: null,
  ...over,
})

describe('parseCalendarPayload', () => {
  const body = {
    from: '2026-11-17',
    events: [
      { title: ' Team stand-up ', start: '2026-11-17T09:30:00Z', end: '2026-11-17T10:00:00Z', location: 'Room 2', calendar: 'Work' },
    ],
  }
  it('parses events and defaults the range to one day', () => {
    expect(parseCalendarPayload(body)).toEqual({
      ok: true,
      from: '2026-11-17',
      to: '2026-11-17',
      events: [
        {
          source: 'shortcut',
          source_id: '2026-11-17T09:30:00.000Z|Team stand-up',
          day: '2026-11-17',
          starts_at: '2026-11-17T09:30:00.000Z',
          ends_at: '2026-11-17T10:00:00.000Z',
          all_day: false,
          title: 'Team stand-up',
          location: 'Room 2',
          calendar: 'Work',
        },
      ],
    })
  })
  it('accepts an empty day, which clears it', () => {
    expect(parseCalendarPayload({ from: '2026-11-17', events: [] })).toMatchObject({ ok: true, events: [] })
    expect(parseCalendarPayload({ from: '2026-11-17' })).toMatchObject({ ok: true, events: [] })
  })
  it('accepts a single event object as well as a list', () => {
    const r = parseCalendarPayload({ from: '2026-11-17', events: body.events[0] })
    expect(r.ok && r.events).toHaveLength(1)
  })
  it('requires a valid from date', () => {
    expect(parseCalendarPayload({ events: [] }).ok).toBe(false)
    expect(parseCalendarPayload({ from: '17/11/2026' }).ok).toBe(false)
  })
  it('rejects a range that runs backwards or is longer than 14 days', () => {
    expect(parseCalendarPayload({ from: '2026-11-17', to: '2026-11-16' }).ok).toBe(false)
    expect(parseCalendarPayload({ from: '2026-11-01', to: '2026-11-20' }).ok).toBe(false)
    expect(parseCalendarPayload({ from: '2026-11-01', to: '2026-11-14' }).ok).toBe(true)
  })
  it('drops events with no title or no usable start, and keeps the rest', () => {
    const r = parseCalendarPayload({
      from: '2026-11-17',
      events: [{ start: '2026-11-17T09:00:00Z' }, { title: 'No time' }, { title: 'Bad', start: 'soon' }, body.events[0]],
    })
    expect(r.ok && r.events.map(e => e.title)).toEqual(['Team stand-up'])
  })
  it('drops events that fall outside the stated range', () => {
    const r = parseCalendarPayload({
      from: '2026-11-17',
      events: [{ title: 'Tomorrow', start: '2026-11-18T09:00:00Z', end: '2026-11-18T10:00:00Z' }],
    })
    expect(r.ok && r.events).toEqual([])
  })
  it('gives a missing or backwards end the start time', () => {
    const r = parseCalendarPayload({
      from: '2026-11-17',
      events: [{ title: 'Call', start: '2026-11-17T09:00:00Z', end: '2026-11-17T08:00:00Z' }],
    })
    expect(r.ok && r.events[0].ends_at).toBe('2026-11-17T09:00:00.000Z')
  })
  it('reads all-day flags sent as true, "true", "Yes" or 1', () => {
    for (const all_day of [true, 'true', 'Yes', 1]) {
      const r = parseCalendarPayload({ from: '2026-11-17', events: [{ title: 'Leave', start: '2026-11-17T00:00:00Z', all_day }] })
      expect(r.ok && r.events[0].all_day).toBe(true)
    }
  })
  it('files a late summer event under its London day', () => {
    const r = parseCalendarPayload({
      from: '2026-07-02',
      events: [{ title: 'Late call', start: '2026-07-01T23:30:00Z', end: '2026-07-02T00:00:00Z' }],
    })
    expect(r.ok && r.events[0].day).toBe('2026-07-02')
  })
  it('collapses the same event sent twice', () => {
    const r = parseCalendarPayload({ from: '2026-11-17', events: [body.events[0], body.events[0]] })
    expect(r.ok && r.events).toHaveLength(1)
  })
})

describe('londonTimeIso', () => {
  it('is the same clock time in winter', () => {
    expect(londonTimeIso('2026-11-17', 8)).toBe('2026-11-17T08:00:00.000Z')
  })
  it('is an hour earlier in UTC during summer time', () => {
    expect(londonTimeIso('2026-07-02', 8)).toBe('2026-07-02T07:00:00.000Z')
  })
  it('is right on the day the clocks go back', () => {
    expect(londonTimeIso('2026-10-25', 8)).toBe('2026-10-25T08:00:00.000Z')
  })
})

describe('londonClock', () => {
  it('shows London time', () => {
    expect(londonClock('2026-07-02T07:00:00Z')).toBe('08:00')
    expect(londonClock('2026-11-17T14:05:00Z')).toBe('14:05')
  })
})

describe('nextEvent', () => {
  const events = [
    ev('2026-11-17T09:00:00Z', '2026-11-17T09:30:00Z', { title: 'Stand-up' }),
    ev('2026-11-17T11:00:00Z', '2026-11-17T12:00:00Z', { title: 'Review' }),
    ev('2026-11-17T00:00:00Z', '2026-11-18T00:00:00Z', { title: 'Leave day', all_day: true }),
  ]
  it('is the meeting in progress while one is running', () => {
    expect(nextEvent(events, new Date('2026-11-17T09:10:00Z'))?.title).toBe('Stand-up')
  })
  it('is the next one to start otherwise', () => {
    expect(nextEvent(events, new Date('2026-11-17T09:45:00Z'))?.title).toBe('Review')
  })
  it('is null once the day is done, and never an all-day entry', () => {
    expect(nextEvent(events, new Date('2026-11-17T13:00:00Z'))).toBeNull()
  })
})

describe('freeGaps', () => {
  const day = '2026-11-17'
  const morning = new Date('2026-11-17T07:00:00Z')
  it('is the whole working day when there are no meetings', () => {
    expect(freeGaps([], day, morning)).toEqual([
      { start: '2026-11-17T08:00:00.000Z', end: '2026-11-17T18:00:00.000Z', minutes: 600 },
    ])
  })
  it('finds the gaps around meetings', () => {
    const events = [ev('2026-11-17T09:00:00Z', '2026-11-17T10:00:00Z'), ev('2026-11-17T13:00:00Z', '2026-11-17T17:00:00Z')]
    expect(freeGaps(events, day, morning).map(g => [londonClock(g.start), londonClock(g.end), g.minutes])).toEqual([
      ['08:00', '09:00', 60],
      ['10:00', '13:00', 180],
      ['17:00', '18:00', 60],
    ])
  })
  it('merges overlapping and back-to-back meetings', () => {
    const events = [
      ev('2026-11-17T09:00:00Z', '2026-11-17T10:00:00Z'),
      ev('2026-11-17T09:30:00Z', '2026-11-17T11:00:00Z'),
      ev('2026-11-17T11:00:00Z', '2026-11-17T12:00:00Z'),
    ]
    expect(freeGaps(events, day, morning).map(g => londonClock(g.start))).toEqual(['08:00', '12:00'])
  })
  it('leaves out gaps too short for a focus session', () => {
    const events = [ev('2026-11-17T08:20:00Z', '2026-11-17T17:40:00Z')]
    expect(freeGaps(events, day, morning)).toEqual([])
  })
  it('starts from now once the day is under way', () => {
    const gaps = freeGaps([], day, new Date('2026-11-17T14:10:00Z'))
    expect(gaps).toEqual([{ start: '2026-11-17T14:10:00.000Z', end: '2026-11-17T18:00:00.000Z', minutes: 230 }])
  })
  it('is empty after the working day', () => {
    expect(freeGaps([], day, new Date('2026-11-17T19:00:00Z'))).toEqual([])
  })
  it('ignores all-day entries, which do not block time', () => {
    const events = [ev('2026-11-17T00:00:00Z', '2026-11-18T00:00:00Z', { all_day: true })]
    expect(freeGaps(events, day, morning)).toHaveLength(1)
  })
})

describe('formatGap', () => {
  it('reads as a time range with its length', () => {
    expect(formatGap({ start: '2026-11-17T10:00:00.000Z', end: '2026-11-17T13:00:00.000Z', minutes: 180 })).toBe(
      '10:00–13:00 (3h)'
    )
    expect(formatGap({ start: '2026-11-17T10:00:00.000Z', end: '2026-11-17T10:45:00.000Z', minutes: 45 })).toBe(
      '10:00–10:45 (45m)'
    )
  })
})

describe('meetingMinutes', () => {
  it('totals timed meetings on the given days and skips all-day entries', () => {
    const events = [
      ev('2026-11-17T09:00:00Z', '2026-11-17T10:00:00Z'),
      ev('2026-11-18T09:00:00Z', '2026-11-18T09:30:00Z'),
      ev('2026-11-17T00:00:00Z', '2026-11-18T00:00:00Z', { all_day: true }),
      ev('2026-11-01T09:00:00Z', '2026-11-01T10:00:00Z'),
    ]
    expect(meetingMinutes(events, ['2026-11-17', '2026-11-18'])).toBe(90)
  })
})

describe('events that cross midnight or run for days', () => {
  it('splits an overnight event into one part per London day', () => {
    const r = parseCalendarPayload({
      from: '2026-11-17',
      to: '2026-11-18',
      events: [{ title: 'Night shift', start: '2026-11-17T23:00:00Z', end: '2026-11-18T01:00:00Z' }],
    })
    expect(r.ok && r.events.map(e => [e.day, e.starts_at, e.ends_at, e.all_day])).toEqual([
      ['2026-11-17', '2026-11-17T23:00:00.000Z', '2026-11-18T00:00:00.000Z', false],
      ['2026-11-18', '2026-11-18T00:00:00.000Z', '2026-11-18T01:00:00.000Z', false],
    ])
    expect(r.ok && new Set(r.events.map(e => e.source_id)).size).toBe(2)
  })
  it('keeps the part of an event that began before the range', () => {
    const r = parseCalendarPayload({
      from: '2026-11-18',
      events: [{ title: 'Night shift', start: '2026-11-17T23:00:00Z', end: '2026-11-18T01:00:00Z' }],
    })
    expect(r.ok && r.events.map(e => e.day)).toEqual(['2026-11-18'])
  })
  it('treats the whole-day parts of a long timed event as all day', () => {
    const r = parseCalendarPayload({
      from: '2026-11-16',
      to: '2026-11-18',
      events: [{ title: 'Conference', start: '2026-11-16T09:00:00Z', end: '2026-11-18T17:00:00Z' }],
    })
    expect(r.ok && r.events.map(e => [e.day, e.all_day])).toEqual([
      ['2026-11-16', false],
      ['2026-11-17', true],
      ['2026-11-18', false],
    ])
    // 15h on the first day and 17h on the last, nothing for the whole day between
    expect(r.ok && meetingMinutes(r.events, ['2026-11-16', '2026-11-17', '2026-11-18'])).toBe(15 * 60 + 17 * 60)
  })
  it('lists a multi-day all-day event on each of its days', () => {
    const r = parseCalendarPayload({
      from: '2026-11-16',
      to: '2026-11-20',
      events: [{ title: 'Annual leave', start: '2026-11-17T00:00:00Z', end: '2026-11-20T00:00:00Z', all_day: true }],
    })
    expect(r.ok && r.events.map(e => [e.day, e.all_day])).toEqual([
      ['2026-11-17', true],
      ['2026-11-18', true],
      ['2026-11-19', true],
    ])
  })
  it('does not let a multi-day event swallow the free time of its first day', () => {
    const r = parseCalendarPayload({
      from: '2026-11-17',
      to: '2026-11-18',
      events: [{ title: 'Offsite', start: '2026-11-17T15:00:00Z', end: '2026-11-18T12:00:00Z' }],
    })
    const day1 = r.ok ? r.events.filter(e => e.day === '2026-11-17') : []
    expect(freeGaps(day1, '2026-11-17', new Date('2026-11-17T07:00:00Z')).map(g => londonClock(g.end))).toEqual(['15:00'])
  })
})

describe('londonTimeIso with minutes', () => {
  it('handles minutes in winter and summer', () => {
    expect(londonTimeIso('2026-11-17', 9, 30)).toBe('2026-11-17T09:30:00.000Z')
    expect(londonTimeIso('2026-07-02', 9, 30)).toBe('2026-07-02T08:30:00.000Z')
  })
})

describe('parseManualEvent', () => {
  const base = { title: ' Dentist ', day: '2026-11-18', start: '09:30', end: '10:15', allDay: false, location: ' High St ' }
  it('turns London clock times into a stored event', () => {
    expect(parseManualEvent(base)).toEqual({
      ok: true,
      event: {
        day: '2026-11-18',
        starts_at: '2026-11-18T09:30:00.000Z',
        ends_at: '2026-11-18T10:15:00.000Z',
        all_day: false,
        title: 'Dentist',
        location: 'High St',
      },
    })
  })
  it('uses summer time when it applies', () => {
    const r = parseManualEvent({ ...base, day: '2026-07-02' })
    expect(r.ok && r.event.starts_at).toBe('2026-07-02T08:30:00.000Z')
  })
  it('defaults the end to an hour after the start', () => {
    const r = parseManualEvent({ ...base, end: '' })
    expect(r.ok && r.event.ends_at).toBe('2026-11-18T10:30:00.000Z')
  })
  it('stops a default end at midnight', () => {
    const r = parseManualEvent({ ...base, start: '23:30', end: '' })
    expect(r.ok && r.event.ends_at).toBe('2026-11-19T00:00:00.000Z')
  })
  it('makes an all-day event cover the whole London day', () => {
    const r = parseManualEvent({ ...base, allDay: true, start: '', end: '' })
    expect(r.ok && r.event).toMatchObject({
      all_day: true,
      starts_at: '2026-11-18T00:00:00.000Z',
      ends_at: '2026-11-19T00:00:00.000Z',
    })
  })
  it('needs a title, a real date and a start time for a timed event', () => {
    expect(parseManualEvent({ ...base, title: '  ' })).toEqual({ ok: false, error: 'Give it a name' })
    expect(parseManualEvent({ ...base, day: '2026-02-30' }).ok).toBe(false)
    expect(parseManualEvent({ ...base, start: '' }).ok).toBe(false)
    expect(parseManualEvent({ ...base, start: '25:00' }).ok).toBe(false)
  })
  it('rejects an end before or at the start', () => {
    expect(parseManualEvent({ ...base, end: '09:00' })).toEqual({ ok: false, error: 'End must be after start' })
    expect(parseManualEvent({ ...base, end: '09:30' }).ok).toBe(false)
  })
  it('leaves a blank location empty', () => {
    const r = parseManualEvent({ ...base, location: '  ' })
    expect(r.ok && r.event.location).toBeNull()
  })
})
