import 'server-only'
import { timingSafeEqual } from 'crypto'

function safeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  const len = Math.max(a.length, b.length)
  const aPadded = Buffer.concat([a, Buffer.alloc(len - a.length)])
  const bPadded = Buffer.concat([b, Buffer.alloc(len - b.length)])
  return timingSafeEqual(aPadded, bPadded) && a.length === b.length
}

/** Constant-time check of the Authorization bearer token against CAPTURE_API_TOKEN. */
export function verifyBearer(request: Request): boolean {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const expected = process.env.CAPTURE_API_TOKEN ?? ''
  return !!token && !!expected && safeEqual(token, expected)
}
