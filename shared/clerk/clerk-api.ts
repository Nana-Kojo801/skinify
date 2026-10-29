// Thin wrapper around the parts of Clerk's Backend API this app uses. Server-side only: it needs the secret key
// (CLERK_SECRET_KEY on the Convex deployment). Endpoints and fields are from Clerk's published OpenAPI spec
// (https://github.com/clerk/openapi-specs, bapi/): base URL https://api.clerk.com/v1, Bearer secret key.
const CLERK_API = 'https://api.clerk.com/v1'

/** How long a demo sign-in ticket can be redeemed. It is single-use anyway. */
export const SIGN_IN_TICKET_SECONDS = 60

async function clerkRequest<T>(secretKey: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    // Clerk's error bodies carry no secrets; keep the status for the Convex logs.
    throw new Error(`Clerk API ${method} ${path} failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

/** The Clerk user id for this email, or null. */
export async function findClerkUserIdByEmail(secretKey: string, email: string): Promise<string | null> {
  const users = await clerkRequest<{ id: string }[]>(secretKey, 'GET', `/users?email_address=${encodeURIComponent(email)}`)
  return users[0]?.id ?? null
}

/** Creates a user without a password (the demo user only ever signs in through a ticket). */
export async function createClerkUser(secretKey: string, email: string): Promise<string> {
  const user = await clerkRequest<{ id: string }>(secretKey, 'POST', '/users', {
    email_address: [email],
    skip_password_requirement: true,
  })
  return user.id
}

/** A one-time token the browser redeems with `signIn.ticket({ ticket })`. */
export async function createSignInTicket(secretKey: string, clerkUserId: string): Promise<string> {
  const result = await clerkRequest<{ token: string }>(secretKey, 'POST', '/sign_in_tokens', {
    user_id: clerkUserId,
    expires_in_seconds: SIGN_IN_TICKET_SECONDS,
  })
  return result.token
}

export async function deleteClerkUser(secretKey: string, clerkUserId: string): Promise<void> {
  await clerkRequest(secretKey, 'DELETE', `/users/${encodeURIComponent(clerkUserId)}`)
}
