import { z } from "zod"

import { bundleSchema } from "@/clinical/schema/bundle"

/*
 * Request and response shapes for /api/content and /api/assessments, shared
 * by the app and the API. No server-only imports: this file is bundled into
 * the app.
 */

/** The content the app should run, pinned by version ID when an assessment starts. */
const currentContentSchema = z.object({
  contentVersionId: z.uuid(),
  version: z.string(),
  checksum: z.string(),
  /** True for a version that isn't PT-approved. Development only. */
  draft: z.boolean(),
  bundle: bundleSchema,
})

const createAssessmentRequestSchema = z.object({
  contentVersionId: z.uuid(),
})

const createdAssessmentSchema = z.object({
  id: z.uuid(),
  contentVersionId: z.uuid(),
})

const answerValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.boolean(),
  z.number(),
])

/** The full answer set so far. Saving replaces the previous set. */
const saveAnswersRequestSchema = z.object({
  answers: z.record(z.string(), answerValueSchema),
})

const outcomeSchema = z.enum(["eligible", "refer", "urgent"])

const submitAssessmentRequestSchema = z.object({
  /**
   * The outcome the app's own engine run showed. The server's result is
   * final; a mismatch is logged so it can be investigated.
   */
  clientOutcome: outcomeSchema.optional(),
})

const assessmentResultSchema = z.object({
  id: z.uuid(),
  outcome: outcomeSchema,
  flags: z.array(z.object({
    ruleId: z.string(),
    severity: z.enum(["urgent", "refer"]),
  })),
  trackId: z.string().nullable(),
  startPhase: z.string().nullable(),
  /** The program created for an eligible result, or null. */
  programId: z.uuid().nullable(),
})

type CurrentContent = z.infer<typeof currentContentSchema>
type AssessmentResult = z.infer<typeof assessmentResultSchema>

export {
  type AssessmentResult,
  assessmentResultSchema,
  createAssessmentRequestSchema,
  createdAssessmentSchema,
  type CurrentContent,
  currentContentSchema,
  outcomeSchema,
  saveAnswersRequestSchema,
  submitAssessmentRequestSchema,
}
