/**
 * The sign-in code from the email, as typed or pasted: digits only,
 * six to ten long. Returns null when it cannot be a code.
 */
export function cleanCode(input: string): string | null {
  const code = input.replace(/[\s-]/g, '')
  return /^\d{6,10}$/.test(code) ? code : null
}

/**
 * Redirect to a path without naming a host. On Netlify a route handler's
 * request URL carries the deploy-specific host (main--site.netlify.app), so a
 * redirect built from it lands on an address where the session cookie does
 * not exist. A relative Location is resolved by the browser against the
 * address it actually used.
 */
export function relativeRedirect(path: string): Response {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('relativeRedirect needs a local path')
  }
  return new Response(null, { status: 303, headers: { Location: path } })
}
