import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

/*
 * Database schema. Changes go through migrations: edit this file, then run
 * `npm run db:generate` and `npm run db:migrate`. Never edit a generated
 * migration that has already been applied.
 */

/**
 * One row per Clerk user, created on their first authenticated request.
 * Every other table references `users.id`, never the Clerk ID.
 */
const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /**
   * The consent text version the user agreed to, with their 18+
   * attestation. Null until they consent; behind the current version means
   * they must consent again.
   */
  consentVersion: text("consent_version"),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
})

type User = typeof users.$inferSelect

export {
  type User,
  users,
}
