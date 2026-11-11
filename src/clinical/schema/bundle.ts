import { z } from "zod"

import { checkBundleIntegrity } from "@/clinical/schema/integrity"
import { id, predicateSchema } from "@/clinical/schema/predicate"

/*
 * The clinical content bundle: everything the engine needs for one
 * condition, as data. A published bundle is immutable and versioned; the
 * PT signs each version (see scripts/publish-content.ts).
 */

const optionSchema = z.object({
  id,
  label: z.string().min(1),
})

/** Where a question goes next: the first edge whose `when` holds. The last edge has no `when`. */
const edgeSchema = z.object({
  when: predicateSchema.optional(),
  goto: z.union([
    id,
    z.literal("complete"),
  ]),
})

const questionBase = {
  id,
  prompt: z.string().min(1),
  help: z.string().optional(),
  next: z.array(edgeSchema).min(1),
}

const questionSchema = z.discriminatedUnion("type", [
  /** One option. Answered with the option ID. */
  z.object({
    ...questionBase,
    type: z.literal("single"),
    options: z.array(optionSchema).min(2),
  }),
  /** One or more options. Answered with a non-empty array of option IDs. */
  z.object({
    ...questionBase,
    type: z.literal("multi"),
    options: z.array(optionSchema).min(2),
  }),
  /** Answered with true or false. */
  z.object({
    ...questionBase,
    type: z.literal("yes-no"),
  }),
  /** A whole number from min to max. */
  z.object({
    ...questionBase,
    type: z.literal("scale"),
    min: z.int(),
    max: z.int(),
    minLabel: z.string().min(1),
    maxLabel: z.string().min(1),
  }),
  /** Body regions from the bundle. Answered with a non-empty array of region IDs. */
  z.object({
    ...questionBase,
    type: z.literal("body-map"),
  }),
])

const questionnaireSchema = z.object({
  start: id,
  questions: z.array(questionSchema).min(1),
})

/**
 * A safety rule (red flag). `urgent` means seek care now; `refer` means
 * see a clinician before starting. `earlyStop` ends the questionnaire as
 * soon as the rule holds; only urgent rules may stop early.
 */
const safetyRuleSchema = z.object({
  id,
  severity: z.enum(["urgent", "refer"]),
  earlyStop: z.boolean(),
  when: predicateSchema,
  /** Plain-language reason, for the PT review doc and the rule trace. */
  summary: z.string().min(1),
})

const regionSchema = z.object({
  id,
  label: z.string().min(1),
})

const exerciseSchema = z.object({
  id,
  name: z.string().min(1),
  cues: z.array(z.string().min(1)).min(1),
  /** When to stop the exercise, shown in the session player. */
  stopRules: z.array(z.string().min(1)).min(1),
  /** Cloudflare Stream video ID; null until the video is recorded. */
  videoId: z.string().min(1).nullable(),
})

/** An exercise in a session, with its dose. Needs reps, a hold, or both. */
const doseSchema = z.object({
  exercise: id,
  sets: z.int().min(1),
  reps: z.int().min(1).optional(),
  holdSeconds: z.int().min(1).optional(),
}).refine(dose => dose.reps !== undefined || dose.holdSeconds !== undefined, "A dose needs reps or holdSeconds")

const sessionSchema = z.object({
  id,
  title: z.string().min(1),
  doses: z.array(doseSchema).min(1),
})

/** Phases run in order. Check-ins move a program forward or back one phase. */
const phaseSchema = z.object({
  id,
  title: z.string().min(1),
  summary: z.string().min(1),
  sessions: z.array(sessionSchema).min(1),
})

const trackSchema = z.object({
  id,
  title: z.string().min(1),
  summary: z.string().min(1),
  phases: z.array(phaseSchema).min(1),
})

/** Picks the track and starting phase for an eligible user. First match wins; the last has no `when`. */
const trackRuleSchema = z.object({
  when: predicateSchema.optional(),
  track: id,
  phase: id,
})

/** A weekly check-in decision. First match wins; the last has no `when`. */
const adjustmentRuleSchema = z.object({
  id,
  when: predicateSchema.optional(),
  decision: z.enum(["progress", "hold", "regress"]),
})

const checkInSchema = z.object({
  questionnaire: questionnaireSchema,
  /** Red-flag re-screen. Any match stops the program and refers the user. */
  safetyRules: z.array(safetyRuleSchema),
  /**
   * When the user is worse. The engine never lets a worse user progress,
   * whatever the adjustment rules say.
   */
  worsening: predicateSchema,
  rules: z.array(adjustmentRuleSchema).min(1),
})

const bundleObjectSchema = z.object({
  schemaVersion: z.literal(1),
  /** The condition, such as `lbp`. */
  id,
  /** Semantic version. Drafts end in `-draft.<n>`. */
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-draft\.\d+)?$/, "Use a version like 1.0.0 or 0.1.0-draft.1"),
  title: z.string().min(1),
  regions: z.array(regionSchema).min(1),
  assessment: questionnaireSchema,
  safetyRules: z.array(safetyRuleSchema).min(1),
  trackRules: z.array(trackRuleSchema).min(1),
  tracks: z.array(trackSchema).min(1),
  exercises: z.array(exerciseSchema).min(1),
  checkIn: checkInSchema,
})

/** Shape plus cross-references (see integrity.ts). */
const bundleSchema = bundleObjectSchema.superRefine((bundle, context) => {
  for (const message of checkBundleIntegrity(bundle)) {
    context.addIssue({ code: "custom", message })
  }
})

type Bundle = z.infer<typeof bundleObjectSchema>
type BundleInput = z.input<typeof bundleObjectSchema>
type Question = z.infer<typeof questionSchema>
type Questionnaire = z.infer<typeof questionnaireSchema>
type SafetyRule = z.infer<typeof safetyRuleSchema>
type Track = z.infer<typeof trackSchema>
type AdjustmentDecision = z.infer<typeof adjustmentRuleSchema>["decision"]

export {
  type AdjustmentDecision,
  type Bundle,
  type BundleInput,
  bundleObjectSchema,
  bundleSchema,
  type Question,
  type Questionnaire,
  type SafetyRule,
  type Track,
}
