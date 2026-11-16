import { describe, expect, it } from 'vitest'
import { cleanCode, relativeRedirect } from './auth'

describe('cleanCode', () => {
  it('accepts a six-digit code', () => {
    expect(cleanCode('123456')).toBe('123456')
  })
  it('strips spaces and dashes people type or paste', () => {
    expect(cleanCode(' 123 456 ')).toBe('123456')
    expect(cleanCode('123-456')).toBe('123456')
  })
  it('accepts longer codes up to ten digits', () => {
    expect(cleanCode('12345678')).toBe('12345678')
    expect(cleanCode('1234567890')).toBe('1234567890')
  })
  it.each(['', '12345', '12345678901', 'abc123', '12345a'])('rejects %j', input => {
    expect(cleanCode(input)).toBeNull()
  })
})

describe('relativeRedirect', () => {
  it('sends the browser to a path on whatever address it is already using', () => {
    const response = relativeRedirect('/today')
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/today')
  })
  it('never names a host, so a deploy-specific address cannot leak in', () => {
    expect(relativeRedirect('/auth?error=auth_failed').headers.get('location')).toBe(
      '/auth?error=auth_failed'
    )
  })
  it('refuses anything that is not a local path', () => {
    expect(() => relativeRedirect('https://example.com')).toThrow()
    expect(() => relativeRedirect('//example.com')).toThrow()
  })
})
