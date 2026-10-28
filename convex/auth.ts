import { Password } from '@convex-dev/auth/providers/Password'
import { convexAuth } from '@convex-dev/auth/server'

// Email + password only: no email verification, no password reset.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
})
