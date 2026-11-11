import type { Db } from "@/server/db/client"
import type { Answers } from "@/clinical/engine/types"
import type { Assessment, User } from "@/server/db/schema"
import type { AssessmentResult } from "@/lib/contracts/assessment"

import { and, eq, sql } from "drizzle-orm"

import { evaluate } from "@/clinical/engine/assessment"
import { answerProblem } from "@/clinical/engine/walk"
import { bundleOf, isServable, versionById } from "@/server/content"
import { assessmentAnswers, assessments, programs, safetyAggregates, safetyFlags } from "@/server/db/schema"

/*
 * Assessment lifecycle: start (pinned to a content version), save answers,
 * submit. At submit the server runs the engine on the stored answers; its
 * result is final, whatever the app showed.
 */

type Failure = { ok: false, status: number, code: "not_found" | "invalid_request" | "conflict" | "incomplete", message: string }
type Result<T> = { ok: true, value: T } | Failure

function failure(status: Failure["status"], code: Failure["code"], message: string): Failure {
  return { ok: false, status, code, message }
}

const notFound = () => failure(404, "not_found", "Assessment not found.")

/** The user's own assessment, or undefined. Another user's assessment reads as missing. */
async function ownAssessment(db: Db, user: User, id: string): Promise<Assessment | undefined> {
  return db.query.assessments.findFirst({
    where: and(eq(assessments.id, id), eq(assessments.userId, user.id)),
  })
}

/**
 * Starts an assessment on a servable content version. A previous
 * unfinished assessment is abandoned, so each user has at most one.
 */
async function startAssessment(db: Db, user: User, contentVersionId: string): Promise<Result<Assessment>> {
  const version = await versionById(db, contentVersionId)
  if (version === undefined || !isServable(version)) {
    return failure(409, "conflict", "This content version isn't available. Reload and start again.")
  }

  const [, [created]] = await db.batch([
    db.update(assessments)
      .set({ status: "abandoned" })
      .where(and(eq(assessments.userId, user.id), eq(assessments.status, "in_progress"))),
    db.insert(assessments).values({ userId: user.id, contentVersionId }).returning(),
  ])
  if (created === undefined) {
    throw new Error("Assessment insert returned no row.")
  }
  return { ok: true, value: created }
}

/**
 * Replaces the saved answers with the full set so far. Every answer must be
 * to a question in the pinned content and fit that question; answers to
 * questions the user went back past are kept but ignored at submit.
 */
async function saveAnswers(db: Db, user: User, id: string, answers: Answers): Promise<Result<null>> {
  const assessment = await ownAssessment(db, user, id)
  if (assessment === undefined) {
    return notFound()
  }
  if (assessment.status !== "in_progress") {
    return failure(409, "conflict", "This assessment is already finished.")
  }

  const version = await versionById(db, assessment.contentVersionId)
  if (version === undefined) {
    throw new Error(`Assessment ${assessment.id} has no content version.`)
  }
  const bundle = bundleOf(version)
  const questions = new Map(bundle.assessment.questions.map(question => [question.id, question]))
  const regionIds = new Set(bundle.regions.map(region => region.id))
  for (const [questionId, value] of Object.entries(answers)) {
    const question = questions.get(questionId)
    if (question === undefined) {
      return failure(400, "invalid_request", `Unknown question "${questionId}".`)
    }
    // The reason describes the expected type only, never the value sent.
    const problem = answerProblem(question, value, regionIds)
    if (problem !== null) {
      return failure(400, "invalid_request", `Answer to "${questionId}": ${problem}.`)
    }
  }

  const rows = Object.entries(answers).map(([questionId, value]) => ({ assessmentId: id, questionId, value }))
  const remove = db.delete(assessmentAnswers).where(eq(assessmentAnswers.assessmentId, id))
  if (rows.length === 0) {
    await remove
  }
  else {
    await db.batch([
      remove,
      db.insert(assessmentAnswers).values(rows),
    ])
  }
  return { ok: true, value: null }
}

/** The stored result of a completed assessment. */
async function storedResult(db: Db, assessment: Assessment): Promise<AssessmentResult> {
  const [flags, program] = await Promise.all([
    db.select({ ruleId: safetyFlags.ruleId, severity: safetyFlags.severity })
      .from(safetyFlags)
      .where(eq(safetyFlags.assessmentId, assessment.id))
      .orderBy(safetyFlags.createdAt),
    db.query.programs.findFirst({
      where: eq(programs.assessmentId, assessment.id),
    }),
  ])
  if (assessment.outcome === null) {
    throw new Error(`Completed assessment ${assessment.id} has no outcome.`)
  }
  return {
    id: assessment.id,
    outcome: assessment.outcome,
    flags,
    trackId: assessment.trackId,
    startPhase: assessment.startPhase,
    programId: program?.id ?? null,
  }
}

function period(date: Date) {
  return date.toISOString().slice(0, 7)
}

/**
 * Evaluates the stored answers with the engine and records the result in
 * one transaction: the outcome and trace, the safety flags, the anonymous
 * safety counts, and the program for an eligible user. Submitting a
 * completed assessment again returns the stored result.
 */
async function submitAssessment(db: Db, user: User, id: string): Promise<Result<AssessmentResult>> {
  const assessment = await ownAssessment(db, user, id)
  if (assessment === undefined) {
    return notFound()
  }
  if (assessment.status === "completed") {
    return { ok: true, value: await storedResult(db, assessment) }
  }
  if (assessment.status === "abandoned") {
    return failure(409, "conflict", "This assessment was replaced by a newer one.")
  }

  const version = await versionById(db, assessment.contentVersionId)
  if (version === undefined) {
    throw new Error(`Assessment ${assessment.id} has no content version.`)
  }
  const bundle = bundleOf(version)
  const answerRows = await db.select().from(assessmentAnswers).where(eq(assessmentAnswers.assessmentId, id))
  const answers: Answers = Object.fromEntries(answerRows.map(row => [row.questionId, row.value as Answers[string]]))

  const result = evaluate(bundle, answers)
  if (result.status === "incomplete") {
    return failure(409, "incomplete", "Answer every question before submitting.")
  }
  if (result.status === "invalid") {
    return failure(400, "invalid_request", `Answer to "${result.question}": ${result.reason}.`)
  }

  const completedAt = new Date()
  const bodyQuestion = bundle.assessment.questions.find(question => question.type === "body-map")
  const bodyRegions = bodyQuestion === undefined
    ? null
    : answers[bodyQuestion.id]
  const month = period(completedAt)
  const countRows = [
    { ruleId: "*", outcome: result.outcome },
    ...result.flags.map(flag => ({ ruleId: flag.ruleId, outcome: result.outcome })),
  ].map(row => ({
    ...row,
    contentVersionId: version.id,
    period: month,
    count: 1,
  }))

  const [, , , , , [program]] = await db.batch([
    db.update(assessments)
      .set({
        status: "completed",
        outcome: result.outcome,
        bodyRegions: Array.isArray(bodyRegions)
          ? bodyRegions
          : null,
        trackId: result.trackId,
        startPhase: result.startPhase,
        engineTrace: result.trace,
        completedAt,
      })
      .where(and(eq(assessments.id, id), eq(assessments.status, "in_progress"))),
    // A concurrent submit of the same assessment updates no row above, so
    // this fails (division by zero) and rolls the whole batch back: each
    // assessment's result is recorded exactly once.
    db.execute(sql`select 1 / (select count(*) from ${assessments} where ${assessments.id} = ${id} and ${assessments.completedAt} = ${completedAt.toISOString()})::int`),
    result.flags.length > 0
      ? db.insert(safetyFlags).values(result.flags.map(flag => ({ assessmentId: id, ruleId: flag.ruleId, severity: flag.severity })))
      : db.execute(sql`select 1`),
    db.insert(safetyAggregates).values(countRows).onConflictDoUpdate({
      target: [
        safetyAggregates.contentVersionId,
        safetyAggregates.ruleId,
        safetyAggregates.outcome,
        safetyAggregates.period,
      ],
      set: { count: sql`${safetyAggregates.count} + 1` },
    }),
    // A new result replaces any active program: completed for a new eligible
    // result, stopped and referred otherwise.
    db.update(programs)
      .set({
        status: result.outcome === "eligible"
          ? "completed"
          : "stopped_referred",
        endedAt: completedAt,
      })
      .where(and(eq(programs.userId, user.id), eq(programs.status, "active"))),
    result.outcome === "eligible" && result.trackId !== null && result.startPhase !== null
      ? db.insert(programs).values({
          userId: user.id,
          assessmentId: id,
          contentVersionId: version.id,
          trackId: result.trackId,
          currentPhase: result.startPhase,
        }).returning({ id: programs.id })
      : db.select({ id: programs.id }).from(programs).where(sql`false`),
  ])

  return {
    ok: true,
    value: {
      id,
      outcome: result.outcome,
      flags: result.flags,
      trackId: result.trackId,
      startPhase: result.startPhase,
      programId: program?.id ?? null,
    },
  }
}

export {
  type Failure,
  type Result,
  saveAnswers,
  startAssessment,
  submitAssessment,
}
