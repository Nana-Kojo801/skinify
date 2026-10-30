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
    // Clerk's error bodies carry no secrets (just an error code and message), so keep them for the Convex logs.
    const detail = await response
      .json()
      .then((body: { errors?: { code?: string; message?: string; meta?: { param_name?: string } }[] }) =>
        body.errors?.map((e) => `${e.code}${e.meta?.param_name ? ` [${e.meta.param_name}]` : ''}: ${e.message}`).join('; '),)
      .catch(() => undefined)
    throw new Error(`Clerk API ${method} ${path} failed with status ${response.status}${detail ? ` (${detail})` : ''}`)
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

type ClerkUser = {
  first_name: string | null
  last_name: string | null
  primary_email_address_id: string | null
  email_addresses: { id: string; email_address: string; verification: { status?: string } | null }[]
}

/**
 * The name and verified primary email of a Clerk user. The session token Convex receives carries neither, so the
 * server asks Clerk. An unverified address is never returned: it could belong to someone else.
 */
export async function getClerkProfile(secretKey: string, clerkUserId: string): Promise<{ email: string | null; name: string | null }> {
  const user = await clerkRequest<ClerkUser>(secretKey, 'GET', `/users/${encodeURIComponent(clerkUserId)}`)
  const primary = user.email_addresses.find((address) => address.id === user.primary_email_address_id)
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ')
  return {
    email: primary?.verification?.status === 'verified' ? primary.email_address : null,
    name: name || null,
  }
}
