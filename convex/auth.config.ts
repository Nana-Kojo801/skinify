// Clerk issues the sign-in tokens; Convex checks them against the Clerk instance named here.
// CLERK_JWT_ISSUER_DOMAIN is the Frontend API URL from the Clerk dashboard (set it with `npx convex env set`).
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: 'convex',
    },
  ],
}
