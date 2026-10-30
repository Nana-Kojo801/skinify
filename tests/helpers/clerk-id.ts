/** A fake Clerk user id for tests: the same email always gives the same (URL-safe) id. Used as the identity `subject`. */
export const clerkIdFor = (email: string) => `user_${email.replace(/[^a-z0-9]/gi, '_')}`
