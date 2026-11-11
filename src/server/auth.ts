import type { Db } from "@/server/db/client"
import type { User } from "@/server/db/schema"

import { createClerkClient } from "@clerk/backend"

import { getDb } from "@/server/db/client"
import { getServerEnv } from "@/server/env"
import { errorResponse } from "@/server/http"
import { findOrCreateUser } from "@/server/users"

type ClerkClient = ReturnType<typeof createClerkClient>

let clerk: ClerkClient | undefined

function getClerk(): ClerkClient {
  if (clerk === undefined) {
    const env = getServerEnv()
    clerk = createClerkClient({
      secretKey: env.CLERK_SECRET_KEY,
      publishableKey: env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    })
  }
  return clerk
}

/**
 * The Clerk user ID for a request's session token, or null. The app sends
 * the token as `Authorization: Bearer <token>`. Only session tokens are
 * accepted; Clerk verifies the signature, expiry, and issuer.
 *
 * Only token verification failures mean "not signed in". A misconfigured
 * server (such as a missing env variable) throws, so it surfaces as a 500
 * instead of passing for a signed-out user.
 */
async function authenticate(request: Request): Promise<string | null> {
  const client = getClerk()
  try {
    const state = await client.authenticateRequest(request, { acceptsToken: "session_token" })
    return state.isAuthenticated
      ? state.toAuth().userId
      : null
  }
  catch {
    return null
  }
}

type Params = Record<string, string>

type UserContext = {
  request: Request
  /** Dynamic route segments, such as `id` for `[id]+api.ts`. */
  params: Params
  /** The internal user. Scope every query by `user.id`. */
  user: User
  db: Db
}

type UserHandler = (context: UserContext) => Promise<Response>

/**
 * Wraps an API route handler so it only runs for a signed-in user. Rejects
 * the request with 401 before touching the database otherwise, and creates
 * the internal user row on the user's first request.
 *
 * ```ts
 * export const GET = withUser(async ({ request, user, db }) => { ... })
 * ```
 */
function withUser(handler: UserHandler) {
  return async (request: Request, params: Params = {}): Promise<Response> => {
    const clerkUserId = await authenticate(request)
    if (clerkUserId === null) {
      return errorResponse(401, "unauthorized", "Sign in to continue.")
    }

    const db = getDb()
    const user = await findOrCreateUser(db, clerkUserId)
    return handler({ request, params, user, db })
  }
}

export {
  type UserContext,
  type UserHandler,
  withUser,
}
