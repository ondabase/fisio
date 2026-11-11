import type { Db } from "@/server/db/client"
import type { User } from "@/server/db/schema"
import type { ProgramSummary, SessionLogRequest } from "@/lib/contracts/program"

import { and, count, desc, eq } from "drizzle-orm"

import { bundleOf, versionById } from "@/server/content"
import { exerciseLogs, programs, sessionLogs } from "@/server/db/schema"

/* Programs and session logging. Every query is scoped to the user. */

const RECENT_DATES = 14

/** The user's most recent program with its progress, or null. */
async function currentProgram(db: Db, user: User): Promise<ProgramSummary | null> {
  const program = await db.query.programs.findFirst({
    where: eq(programs.userId, user.id),
    orderBy: desc(programs.startedAt),
  })
  if (program === undefined) {
    return null
  }

  const [[inPhase], recent] = await Promise.all([
    db.select({
      value: count(),
    }).from(sessionLogs).where(and(
      eq(sessionLogs.programId, program.id),
      eq(sessionLogs.phaseId, program.currentPhase),
    )),
    db.select({ date: sessionLogs.scheduledDate }).from(sessionLogs).where(eq(sessionLogs.programId, program.id)).orderBy(desc(sessionLogs.scheduledDate), desc(sessionLogs.completedAt)).limit(RECENT_DATES),
  ])

  return {
    id: program.id,
    status: program.status,
    contentVersionId: program.contentVersionId,
    trackId: program.trackId,
    currentPhase: program.currentPhase,
    startedAt: program.startedAt.toISOString(),
    progress: {
      completedInPhase: inPhase?.value ?? 0,
      recentDates: recent.map(row => row.date),
    },
  }
}

/** Whether the user may read a content version: it's pinned by one of their programs. */
async function userHasVersion(db: Db, user: User, contentVersionId: string) {
  const program = await db.query.programs.findFirst({
    where: and(eq(programs.userId, user.id), eq(programs.contentVersionId, contentVersionId)),
  })
  return program !== undefined
}

type LogResult
  = | { ok: true, created: boolean }
    | { ok: false, status: number, code: "not_found" | "invalid_request" | "conflict", message: string }

/** Allowed clock difference between the app and the server for `completedAt`. */
const CLOCK_SKEW_MS = 5 * 60_000

/**
 * Records a completed session exactly once. The program must be the user's,
 * and the session, phase, and exercises must match its content; a session
 * done offline is accepted even if the program has since ended.
 */
async function recordSession(db: Db, user: User, log: SessionLogRequest): Promise<LogResult> {
  const existing = await db.query.sessionLogs.findFirst({
    where: eq(sessionLogs.id, log.id),
  })
  if (existing !== undefined) {
    return existing.userId === user.id
      ? { ok: true, created: false }
      : {
          ok: false,
          status: 409,
          code: "conflict",
          message: "This session ID is already used.",
        }
  }

  const program = await db.query.programs.findFirst({
    where: and(eq(programs.id, log.programId), eq(programs.userId, user.id)),
  })
  if (program === undefined) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      message: "Program not found.",
    }
  }

  const version = await versionById(db, program.contentVersionId)
  if (version === undefined) {
    throw new Error(`Program ${program.id} has no content version.`)
  }
  const track = bundleOf(version).tracks.find(candidate => candidate.id === program.trackId)
  const session = track?.phases.find(phase => phase.id === log.phaseId)?.sessions.find(candidate => candidate.id === log.sessionId)
  if (session === undefined) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "The session isn't part of this program.",
    }
  }
  const matches = log.exercises.length === session.doses.length
    && log.exercises.every(exercise => session.doses[exercise.position]?.exercise === exercise.exerciseId)
  if (!matches) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "The exercises don't match the session.",
    }
  }
  if (new Date(log.completedAt).getTime() > Date.now() + CLOCK_SKEW_MS) {
    return {
      ok: false,
      status: 400,
      code: "invalid_request",
      message: "completedAt is in the future.",
    }
  }

  // A concurrent retry of the same log inserts nothing the second time.
  await db.batch([
    db.insert(sessionLogs).values({
      id: log.id,
      userId: user.id,
      programId: program.id,
      sessionId: log.sessionId,
      phaseId: log.phaseId,
      scheduledDate: log.scheduledDate,
      completedAt: new Date(log.completedAt),
      painAfter: log.painAfter,
    }).onConflictDoNothing(),
    db.insert(exerciseLogs).values(log.exercises.map(exercise => ({ sessionLogId: log.id, ...exercise }))).onConflictDoNothing(),
  ])
  return { ok: true, created: true }
}

export {
  currentProgram,
  type LogResult,
  recordSession,
  userHasVersion,
}
