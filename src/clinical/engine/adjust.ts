import type { Bundle } from "@/clinical/schema/bundle"
import type { Answers, Decision, Flag, TraceEntry, Unfinished } from "@/clinical/engine/types"

import { holds } from "@/clinical/engine/predicate"
import { matchingFlags, walk } from "@/clinical/engine/walk"

/*
 * The weekly check-in. Content rules propose progress, hold, or regress;
 * the engine then applies safety invariants that hold whatever the content
 * says:
 * 1. Any re-screen red flag stops the program and refers the user.
 * 2. A worse user never progresses (progress becomes hold).
 * 3. A program can't move past its first or last phase (becomes hold).
 */

type ProgramPosition = {
  trackId: string
  phaseId: string
}

type Adjustment = {
  status: "adjusted"
  decision: Decision
  /** The content rule that decided, or null when a safety flag stopped the program. */
  ruleId: string | null
  fromPhase: string
  toPhase: string
  flags: Array<Flag>
  trace: Array<TraceEntry>
}

function adjust(bundle: Bundle, program: ProgramPosition, answers: Answers): Adjustment | Unfinished {
  const track = bundle.tracks.find(candidate => candidate.id === program.trackId)
  const phaseIndex = track?.phases.findIndex(phase => phase.id === program.phaseId) ?? -1
  if (track === undefined || phaseIndex === -1) {
    throw new Error(`Program position ${program.trackId}/${program.phaseId} isn't in bundle ${bundle.version}.`)
  }

  const { checkIn } = bundle
  const regions = new Set(bundle.regions.map(region => region.id))
  const result = walk(checkIn.questionnaire, checkIn.safetyRules, regions, answers)
  if (result.status === "pending") {
    return { status: "incomplete", question: result.question }
  }
  if (result.status === "invalid") {
    return result
  }

  const trace = [...result.trace]
  const flags = result.status === "early-stop"
    ? result.flags
    : matchingFlags(checkIn.safetyRules, result.known)
  if (result.status === "complete") {
    for (const flag of flags) {
      trace.push({ kind: "safety", ...flag })
    }
  }
  if (flags.length > 0) {
    trace.push({
      kind: "override",
      reason: "safety-flag-stops-program",
      from: "hold",
      to: "stop",
    })
    return {
      status: "adjusted",
      decision: "stop",
      ruleId: null,
      fromPhase: program.phaseId,
      toPhase: program.phaseId,
      flags,
      trace,
    }
  }

  const rule = checkIn.rules.find(candidate => candidate.when === undefined || holds(candidate.when, result.known))
  if (rule === undefined) {
    throw new Error("No check-in rule matched: the bundle wasn't validated.")
  }
  trace.push({ kind: "adjustment", ruleId: rule.id, decision: rule.decision })

  let decision: Decision = rule.decision
  if (decision === "progress" && holds(checkIn.worsening, result.known)) {
    trace.push({
      kind: "override",
      reason: "worsening-blocks-progress",
      from: "progress",
      to: "hold",
    })
    decision = "hold"
  }

  let toPhase = program.phaseId
  if (decision === "progress") {
    const next = track.phases[phaseIndex + 1]
    if (next === undefined) {
      trace.push({
        kind: "override",
        reason: "already-final-phase",
        from: "progress",
        to: "hold",
      })
      decision = "hold"
    }
    else {
      toPhase = next.id
    }
  }
  else if (decision === "regress") {
    const previous = track.phases[phaseIndex - 1]
    if (previous === undefined) {
      trace.push({
        kind: "override",
        reason: "already-first-phase",
        from: "regress",
        to: "hold",
      })
      decision = "hold"
    }
    else {
      toPhase = previous.id
    }
  }

  return {
    status: "adjusted",
    decision,
    ruleId: rule.id,
    fromPhase: program.phaseId,
    toPhase,
    flags,
    trace,
  }
}

export {
  adjust,
  type Adjustment,
  type ProgramPosition,
}
