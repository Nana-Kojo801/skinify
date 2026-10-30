import { afterEach, describe, expect, it, vi } from 'vitest'
import { createClerkUser, createSignInTicket, deleteClerkUser, findClerkUserIdByEmail } from '../shared/clerk/clerk-api'

afterEach(() => vi.unstubAllGlobals())

const stub = (response: Response) => {
  const fetchMock = vi.fn(async () => response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('clerk-api', () => {
  it('looks a user up by email (encoded) and returns null when there is none', async () => {
    const fetchMock = stub(new Response(JSON.stringify([{ id: 'user_1' }]), { status: 200 }))
    expect(await findClerkUserIdByEmail('sk', 'a+b@example.com')).toBe('user_1')
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://api.clerk.com/v1/users?email_address=a%2Bb%40example.com')
    stub(new Response('[]', { status: 200 }))
    expect(await findClerkUserIdByEmail('sk', 'none@example.com')).toBeNull()
  })

  it('creates a passwordless user', async () => {
    const fetchMock = stub(new Response(JSON.stringify({ id: 'user_2' }), { status: 200 }))
    expect(await createClerkUser('sk', 'demo@example.com')).toBe('user_2')
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(JSON.parse(init.body as string)).toEqual({ email_address: ['demo@example.com'], skip_password_requirement: true })
  })

  it('creates a sign-in ticket and deletes users with the secret key as Bearer token', async () => {
    const tokenMock = stub(new Response(JSON.stringify({ token: 'tkn' }), { status: 200 }))
    expect(await createSignInTicket('sk_test_x', 'user_3')).toBe('tkn')
    expect(((tokenMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>).Authorization).toBe('Bearer sk_test_x')
    const deleteMock = stub(new Response('{}', { status: 200 }))
    await deleteClerkUser('sk', 'user_3')
    expect((deleteMock.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe('DELETE')
  })

  it('throws with the status but never the secret key', async () => {
    stub(new Response('{}', { status: 401 }))
    const error = await deleteClerkUser('sk_test_topsecret', 'user_4').catch((e: Error) => e)
    expect((error as Error).message).toMatch(/status 401/)
    expect((error as Error).message).not.toContain('topsecret')
  })
})
