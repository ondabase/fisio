import type { Bundle } from "@/clinical/schema/bundle"

import { z } from "zod"

import { adjust } from "@/clinical/engine/adjust"
import { evaluate } from "@/clinical/engine/assessment"

/*
 * Vignettes: PT-authored scenarios with an expected result, run as golden
 * tests in CI and by publish-content. A content version can't be published
 * unless every vignette passes.
 */

const answersSchema = z.record(z.string(), z.union([
  z.string(),
  z.array(z.string()),
  z.boolean(),
  z.number(),
]))

const assessmentVignetteSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("assessment"),
  description: z.string().min(1),
  answers: answersSchema,
  expect: z.object({
    outcome: z.enum(["eligible", "refer", "urgent"]),
    /** Every safety rule expected to hold, in any order. */
    flags: z.array(z.string()),
    trackId: z.string().nullable(),
    startPhase: z.string().nullable(),
    /** True when an urgent flag should end the questionnaire early. */
    earlyStop: z.boolean(),
  }),
})

const checkInVignetteSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("check-in"),
  description: z.string().min(1),
  program: z.object({
    trackId: z.string(),
    phaseId: z.string(),
  }),
  answers: answersSchema,
  expect: z.object({
    decision: z.enum(["progress", "hold", "regress", "stop"]),
    toPhase: z.string(),
    flags: z.array(z.string()),
  }),
})

const vignetteSchema = z.discriminatedUnion("kind", [assessmentVignetteSchema, checkInVignetteSchema])
const vignetteFileSchema = z.array(vignetteSchema).min(1)

type Vignette = z.infer<typeof vignetteSchema>

type VignetteResult = {
  id: string
  description: string
  passed: boolean
  /** What differed from the expectation. Empty when passed. */
  failures: Array<string>
}

function compare(label: string, actual: unknown, expected: unknown, failures: Array<string>) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

function sorted(values: Array<string>) {
  return [...values].sort()
}

function runVignette(bundle: Bundle, vignette: Vignette): VignetteResult {
  const failures: Array<string> = []

  if (vignette.kind === "assessment") {
    const result = evaluate(bundle, vignette.answers)
    if (result.status !== "evaluated") {
      failures.push(`assessment didn't finish: ${result.status} at "${result.question}"`)
    }
    else {
      const { expect } = vignette
      compare("outcome", result.outcome, expect.outcome, failures)
      compare("flags", sorted(result.flags.map(flag => flag.ruleId)), sorted(expect.flags), failures)
      compare("trackId", result.trackId, expect.trackId, failures)
      compare("startPhase", result.startPhase, expect.startPhase, failures)
      compare("earlyStop", result.trace.some(entry => entry.kind === "early-stop"), expect.earlyStop, failures)
    }
  }
  else {
    const result = adjust(bundle, vignette.program, vignette.answers)
    if (result.status !== "adjusted") {
      failures.push(`check-in didn't finish: ${result.status} at "${result.question}"`)
    }
    else {
      const { expect } = vignette
      compare("decision", result.decision, expect.decision, failures)
      compare("toPhase", result.toPhase, expect.toPhase, failures)
      compare("flags", sorted(result.flags.map(flag => flag.ruleId)), sorted(expect.flags), failures)
    }
  }

  return {
    id: vignette.id,
    description: vignette.description,
    passed: failures.length === 0,
    failures,
  }
}

/** Runs every vignette. Pure and synchronous, so scripts and tests share it. */
function runVignettes(bundle: Bundle, vignettes: ReadonlyArray<Vignette>): Array<VignetteResult> {
  return vignettes.map(vignette => runVignette(bundle, vignette))
}

export {
  runVignettes,
  type Vignette,
  vignetteFileSchema,
  type VignetteResult,
}
