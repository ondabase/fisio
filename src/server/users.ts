import type { Me } from "@/lib/contracts/me"
import type { Db } from "@/server/db/client"
import type { User } from "@/server/db/schema"

import { eq } from "drizzle-orm"

import { users } from "@/server/db/schema"
import { CURRENT_CONSENT_VERSION } from "@/lib/consent"

/**
 * The internal user for a Clerk user, created on first sight. One query for
 * an existing user; an insert for a new one. A concurrent first request
 * hits the unique constraint, does nothing, and reads the row the other made.
 */
async function findOrCreateUser(db: Db, clerkUserId: string): Promise<User> {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  })
  if (existing !== undefined) {
    return existing
  }

  const [created] = await db.insert(users).values({ clerkUserId }).onConflictDoNothing().returning()
  if (created !== undefined) {
    return created
  }

  const raced = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  })
  if (raced === undefined) {
    throw new Error("User row missing after insert conflict.")
  }
  return raced
}

/** Records agreement to the current consent version. */
async function recordConsent(db: Db, userId: string): Promise<User> {
  const [updated] = await db
    .update(users)
    .set({
      consentVersion: CURRENT_CONSENT_VERSION,
      consentedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()
  if (updated === undefined) {
    throw new Error("User row missing while recording consent.")
  }
  return updated
}

/** The user as the app sees it. Leaves out the Clerk ID. */
function toMe(user: User): Me {
  return {
    id: user.id,
    consentVersion: user.consentVersion,
    consentedAt: user.consentedAt?.toISOString() ?? null,
    hasCurrentConsent: user.consentVersion === CURRENT_CONSENT_VERSION,
  }
}

export {
  findOrCreateUser,
  recordConsent,
  toMe,
}
