import { sql } from "drizzle-orm"
import { boolean, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core"

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

const contentStatus = pgEnum("content_status", ["draft", "approved", "retired"])

/**
 * A published version of a clinical content bundle (src/clinical/content).
 * `bundle` and `checksum` never change after insert; a database trigger
 * enforces it (see the content_versions_immutable migration). Only
 * `approved` versions are served to users, and only after PT sign-off.
 */
const contentVersions = pgTable("content_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** The condition, such as `lbp`. */
  contentId: text("content_id").notNull(),
  version: text("version").notNull(),
  status: contentStatus("status").notNull().default("draft"),
  bundle: jsonb("bundle").notNull(),
  /** SHA-256 of the canonical bundle JSON. */
  checksum: text("checksum").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
}, table => [
  unique("content_versions_content_id_version_unique").on(table.contentId, table.version),
])

type ContentVersion = typeof contentVersions.$inferSelect

const assessmentStatus = pgEnum("assessment_status", ["in_progress", "completed", "abandoned"])
const outcome = pgEnum("assessment_outcome", ["eligible", "refer", "urgent"])
const severity = pgEnum("safety_severity", ["urgent", "refer"])

/**
 * One run of the assessment, pinned to the content version it started on.
 * The outcome, flags, track, and trace come from the server's own engine
 * run at submit, never from the client. A user has at most one in progress.
 */
const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentVersionId: uuid("content_version_id").notNull().references(() => contentVersions.id),
  status: assessmentStatus("status").notNull().default("in_progress"),
  outcome: outcome("outcome"),
  bodyRegions: text("body_regions").array(),
  trackId: text("track_id"),
  startPhase: text("start_phase"),
  /** Every rule the engine applied, for audit (see src/clinical/engine/types.ts). */
  engineTrace: jsonb("engine_trace"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, table => [
  uniqueIndex("assessments_one_in_progress_per_user").on(table.userId).where(sql`${table.status} = 'in_progress'`),
])

/** The latest answer to each question of an assessment. */
const assessmentAnswers = pgTable("assessment_answers", {
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  value: jsonb("value").notNull(),
  answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  primaryKey({
    columns: [table.assessmentId, table.questionId],
  }),
])

/** A safety rule that held at submit. */
const safetyFlags = pgTable("safety_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  ruleId: text("rule_id").notNull(),
  severity: severity("severity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

const programStatus = pgEnum("program_status", [
  "active",
  "paused",
  "completed",
  "stopped_referred",
])

/** A user's program from an eligible assessment. At most one is active. */
const programs = pgTable("programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  contentVersionId: uuid("content_version_id").notNull().references(() => contentVersions.id),
  trackId: text("track_id").notNull(),
  currentPhase: text("current_phase").notNull(),
  status: programStatus("status").notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, table => [
  uniqueIndex("programs_one_active_per_user").on(table.userId).where(sql`${table.status} = 'active'`),
])

/**
 * Counts of assessment outcomes and safety rules per content version and
 * month, for safety monitoring. No link to any user, so the counts survive
 * account deletion. `rule_id` is `*` for a count of the outcome alone.
 */
const safetyAggregates = pgTable("safety_aggregates", {
  id: uuid("id").primaryKey().defaultRandom(),
  contentVersionId: uuid("content_version_id").notNull().references(() => contentVersions.id),
  ruleId: text("rule_id").notNull(),
  outcome: outcome("outcome").notNull(),
  /** Calendar month, such as `2026-11`. */
  period: text("period").notNull(),
  count: integer("count").notNull().default(0),
}, table => [
  unique("safety_aggregates_key").on(table.contentVersionId, table.ruleId, table.outcome, table.period),
])

/**
 * A completed exercise session. The ID is generated by the app, so a
 * session done offline and synced later (or sent twice) is recorded once.
 */
const sessionLogs = pgTable("session_logs", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  programId: uuid("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
  /** Content IDs of the session and the phase it counted toward. */
  sessionId: text("session_id").notNull(),
  phaseId: text("phase_id").notNull(),
  /** The user's local calendar date when they did it. */
  scheduledDate: date("scheduled_date").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
  /** Pain right after the session, 0 to 10. */
  painAfter: integer("pain_after").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index("session_logs_program_idx").on(table.programId),
])

/** Each exercise of a logged session, by its position in the session. */
const exerciseLogs = pgTable("exercise_logs", {
  sessionLogId: uuid("session_log_id").notNull().references(() => sessionLogs.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  exerciseId: text("exercise_id").notNull(),
  completed: boolean("completed").notNull(),
  setsDone: integer("sets_done").notNull(),
}, table => [
  primaryKey({
    columns: [table.sessionLogId, table.position],
  }),
])

type Assessment = typeof assessments.$inferSelect
type Program = typeof programs.$inferSelect
type SessionLog = typeof sessionLogs.$inferSelect

export {
  type Assessment,
  assessmentAnswers,
  assessments,
  assessmentStatus,
  contentStatus,
  type ContentVersion,
  contentVersions,
  exerciseLogs,
  outcome,
  type Program,
  programs,
  programStatus,
  safetyAggregates,
  safetyFlags,
  type SessionLog,
  sessionLogs,
  severity,
  type User,
  users,
}
