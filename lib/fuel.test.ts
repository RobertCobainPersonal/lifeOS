import { describe, expect, it } from 'vitest'
import { dayTotals, parseFoodInput } from './fuel'

describe('parseFoodInput', () => {
  it('accepts a normal entry and trims the label', () => {
    expect(parseFoodInput({ label: ' Chicken wrap ', kcal: '520', protein: '38' })).toEqual({
      ok: true,
      label: 'Chicken wrap',
      kcal: 520,
      protein_g: 38,
    })
  })
  it('treats blank protein as zero', () => {
    expect(parseFoodInput({ label: 'Toast', kcal: '180', protein: '' })).toMatchObject({
      ok: true,
      protein_g: 0,
    })
  })
  it('rounds decimal calories', () => {
    expect(parseFoodInput({ label: 'x', kcal: '520.6', protein: '' })).toMatchObject({
      ok: true,
      kcal: 521,
    })
  })
  it('accepts zero calories', () => {
    expect(parseFoodInput({ label: 'Black coffee', kcal: '0', protein: '' })).toMatchObject({
      ok: true,
      kcal: 0,
    })
  })
  it.each(['', '   ', 'abc', '-50', '5,20', '9000', '1e3', 'Infinity'])(
    'rejects calories %j',
    kcal => {
      expect(parseFoodInput({ label: 'x', kcal, protein: '' }).ok).toBe(false)
    }
  )
  it.each(['abc', '-1', '900'])('rejects protein %j', protein => {
    expect(parseFoodInput({ label: 'x', kcal: '100', protein }).ok).toBe(false)
  })
  it('rejects a blank label', () => {
    expect(parseFoodInput({ label: '  ', kcal: '100', protein: '' }).ok).toBe(false)
  })
  it('gives a message a person can act on', () => {
    const result = parseFoodInput({ label: 'x', kcal: '5,20', protein: '' })
    expect(result).toEqual({ ok: false, error: 'Calories must be a number from 0 to 5,000' })
  })
})

describe('dayTotals', () => {
  it('adds calories and protein', () => {
    expect(
      dayTotals([
        { kcal: 500, protein_g: 30 },
        { kcal: 250, protein_g: 12 },
      ])
    ).toEqual({ kcal: 750, protein_g: 42 })
  })
  it('is zero for an empty day', () => {
    expect(dayTotals([])).toEqual({ kcal: 0, protein_g: 0 })
  })
})
