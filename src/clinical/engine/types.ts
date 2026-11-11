import type { AdjustmentDecision } from "@/clinical/schema/bundle"

/*
 * Engine inputs and outputs. Everything here is plain JSON, so results can be
 * stored (engine_trace) and compared between client and server.
 */

/** An answer: an option ID, option or region IDs, a yes/no, or a scale number. */
type AnswerValue = string | Array<string> | boolean | number

/** Answers keyed by question ID. */
type Answers = Readonly<Record<string, AnswerValue>>

/** A safety rule that held. */
type Flag = {
  ruleId: string
  severity: "urgent" | "refer"
}

/** One step of the engine's reasoning, in order. */
type TraceEntry
  = | { kind: "answer", question: string }
    | { kind: "edge", from: string, to: string, edge: number }
    | { kind: "safety", ruleId: string, severity: "urgent" | "refer" }
    | { kind: "early-stop", ruleIds: Array<string> }
    | { kind: "track", rule: number, track: string, phase: string }
    | { kind: "adjustment", ruleId: string, decision: AdjustmentDecision }
    | { kind: "override", reason: OverrideReason, from: Decision, to: Decision }

/**
 * Why the engine changed a content decision. These encode safety
 * invariants that hold whatever the content says.
 */
type OverrideReason
  = | "safety-flag-stops-program"
    | "worsening-blocks-progress"
    | "already-final-phase"
    | "already-first-phase"

/** A check-in decision, including the engine's stop-and-refer. */
type Decision = AdjustmentDecision | "stop"

/** Why a questionnaire can't be evaluated yet. */
type Unfinished
  = | { status: "incomplete", question: string }
    | { status: "invalid", question: string, reason: string }

export {
  type Answers,
  type AnswerValue,
  type Decision,
  type Flag,
  type OverrideReason,
  type TraceEntry,
  type Unfinished,
}
