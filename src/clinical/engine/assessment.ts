import type { Bundle } from "@/clinical/schema/bundle"
import type { Answers, Flag, TraceEntry, Unfinished } from "@/clinical/engine/types"

import { holds } from "@/clinical/engine/predicate"
import { matchingFlags, walk } from "@/clinical/engine/walk"

/*
 * The assessment. The client calls `nextStep` after every answer for an
 * instant flow; the server calls `evaluate` on the full answer set at
 * submit, and the server's result is final.
 */

type NextStep
  = | { kind: "question", question: string }
    /** An urgent red flag held: stop now and show the emergency screen. */
    | { kind: "early-stop", flags: Array<Flag> }
    | { kind: "complete" }
    | { kind: "invalid", question: string, reason: string }

function regionIds(bundle: Bundle) {
  return new Set(bundle.regions.map(region => region.id))
}

/** What to show next, given the answers so far. */
function nextStep(bundle: Bundle, answers: Answers): NextStep {
  const result = walk(bundle.assessment, bundle.safetyRules, regionIds(bundle), answers)
  switch (result.status) {
    case "pending":
      return { kind: "question", question: result.question }
    case "invalid":
      return { kind: "invalid", question: result.question, reason: result.reason }
    case "early-stop":
      return { kind: "early-stop", flags: result.flags }
    case "complete":
      return { kind: "complete" }
  }
}

type Outcome = "eligible" | "refer" | "urgent"

type Evaluation = {
  status: "evaluated"
  /**
   * urgent: seek care now. refer: see a clinician before starting.
   * eligible: start the program.
   */
  outcome: Outcome
  /** Every safety rule that held, in content order. */
  flags: Array<Flag>
  /** Set only when eligible. */
  trackId: string | null
  startPhase: string | null
  /** Questions whose answers counted, in the order asked. */
  answered: Array<string>
  trace: Array<TraceEntry>
}

/**
 * The final assessment result for a complete set of answers. An urgent
 * early stop is a complete result: the remaining questions aren't needed.
 */
function evaluate(bundle: Bundle, answers: Answers): Evaluation | Unfinished {
  const result = walk(bundle.assessment, bundle.safetyRules, regionIds(bundle), answers)
  switch (result.status) {
    case "pending":
      return { status: "incomplete", question: result.question }
    case "invalid":
      return result
    case "early-stop":
      return {
        status: "evaluated",
        outcome: "urgent",
        flags: result.flags,
        trackId: null,
        startPhase: null,
        answered: Object.keys(result.known),
        trace: result.trace,
      }
    case "complete":
      break
  }

  const trace = [...result.trace]
  const flags = matchingFlags(bundle.safetyRules, result.known)
  for (const flag of flags) {
    trace.push({ kind: "safety", ...flag })
  }

  const answered = Object.keys(result.known)
  const outcome: Outcome = flags.some(flag => flag.severity === "urgent")
    ? "urgent"
    : flags.length > 0
      ? "refer"
      : "eligible"
  if (outcome !== "eligible") {
    return {
      status: "evaluated",
      outcome,
      flags,
      trackId: null,
      startPhase: null,
      answered,
      trace,
    }
  }

  const ruleIndex = bundle.trackRules.findIndex(rule => rule.when === undefined || holds(rule.when, result.known))
  const rule = bundle.trackRules[ruleIndex]
  if (rule === undefined) {
    throw new Error("No track rule matched: the bundle wasn't validated.")
  }
  trace.push({
    kind: "track",
    rule: ruleIndex,
    track: rule.track,
    phase: rule.phase,
  })
  return {
    status: "evaluated",
    outcome,
    flags,
    trackId: rule.track,
    startPhase: rule.phase,
    answered,
    trace,
  }
}

export {
  evaluate,
  type Evaluation,
  nextStep,
  type NextStep,
  type Outcome,
}
