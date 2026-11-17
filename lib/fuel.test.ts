import { describe, expect, it } from 'vitest'
import { DEFAULT_BANDS, cleanBands, dayTotals, parseFoodInput, resolveBands } from './fuel'

describe('parseFoodInput', () => {
  it('accepts a normal entry and trims the label', () => {
    expect(parseFoodInput({ label: ' Chicken wrap ', kcal: '520', protein: '38' })).toEqual({
      ok: true,
      label: 'Chicken wrap',
      kcal: 520,
      protein_g: 38,
      carbs_g: 0,
      fat_g: 0,
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
    ).toEqual({ kcal: 750, protein_g: 42, carbs_g: 0, fat_g: 0 })
  })
  it('is zero for an empty day', () => {
    expect(dayTotals([])).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  })
})

describe('parseFoodInput with macros', () => {
  it('accepts carbs and fat', () => {
    expect(parseFoodInput({ label: 'Oats', kcal: '420', protein: '28', carbs: '55', fat: '9.4' })).toMatchObject({
      ok: true,
      carbs_g: 55,
      fat_g: 9,
    })
  })
  it('treats blank carbs and fat as zero', () => {
    expect(parseFoodInput({ label: 'Oats', kcal: '420', protein: '', carbs: '', fat: ' ' })).toMatchObject({
      ok: true,
      carbs_g: 0,
      fat_g: 0,
    })
  })
  it.each(['abc', '-3', '2,5', '900'])('rejects carbs %j', carbs => {
    expect(parseFoodInput({ label: 'x', kcal: '100', protein: '', carbs }).ok).toBe(false)
  })
  it.each(['abc', '-3', '500'])('rejects fat %j', fat => {
    expect(parseFoodInput({ label: 'x', kcal: '100', protein: '', fat }).ok).toBe(false)
  })
})

describe('dayTotals with macros', () => {
  it('adds carbs and fat, treating older entries without them as zero', () => {
    expect(
      dayTotals([
        { kcal: 500, protein_g: 30, carbs_g: 40, fat_g: 12 },
        { kcal: 250, protein_g: 12 },
      ])
    ).toEqual({ kcal: 750, protein_g: 42, carbs_g: 40, fat_g: 12 })
  })
})

describe('calorie bands', () => {
  it('starts from the baseline figures', () => {
    expect(DEFAULT_BANDS.map(b => [b.key, b.kcal])).toEqual([
      ['rest', 1800],
      ['light', 2200],
      ['training', 2500],
      ['long', 2900],
    ])
  })
  it('uses stored figures over the baseline, band by band', () => {
    const bands = resolveBands({ rest: 1900, long: 3000 })
    expect(bands.map(b => b.kcal)).toEqual([1900, 2200, 2500, 3000])
  })
  it('ignores stored values that are not sensible numbers', () => {
    expect(resolveBands({ rest: 'lots', light: 50, training: null }).map(b => b.kcal)).toEqual([1800, 2200, 2500, 2900])
    expect(resolveBands(null).map(b => b.kcal)).toEqual([1800, 2200, 2500, 2900])
  })
  it('validates an edit of all four', () => {
    expect(cleanBands({ rest: '1850', light: '2200', training: '2600', long: '3000' })).toEqual({
      ok: true,
      bands: { rest: 1850, light: 2200, training: 2600, long: 3000 },
    })
  })
  it('rejects a band outside 1,000 to 5,000 or left blank', () => {
    expect(cleanBands({ rest: '900', light: '2200', training: '2600', long: '3000' }).ok).toBe(false)
    expect(cleanBands({ rest: '1800', light: '', training: '2600', long: '3000' }).ok).toBe(false)
    expect(cleanBands({ rest: '1800', light: '2200', training: '2600', long: '6000' }).ok).toBe(false)
  })
})
