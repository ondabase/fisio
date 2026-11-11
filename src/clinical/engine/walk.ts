import type { Question, Questionnaire, SafetyRule } from "@/clinical/schema/bundle"
import type { Answers, AnswerValue, Flag, TraceEntry } from "@/clinical/engine/types"

import { holds } from "@/clinical/engine/predicate"

/*
 * Walks a questionnaire from its start, following the first edge that holds
 * after each answer. Only answers to questions on the walked path count:
 * an answer to a question the user was never asked is ignored, so a client
 * can't steer the outcome by sending extra answers.
 */

/** Why an answer doesn't fit its question, or null when it fits. */
function answerProblem(question: Question, value: AnswerValue, regionIds: ReadonlySet<string>): string | null {
  switch (question.type) {
    case "single":
      return typeof value === "string" && question.options.some(option => option.id === value)
        ? null
        : "expected one of the question's option IDs"
    case "multi":
    case "body-map": {
      const allowed = question.type === "multi"
        ? new Set(question.options.map(option => option.id))
        : regionIds
      const fits = Array.isArray(value)
        && value.length > 0
        && new Set(value).size === value.length
        && value.every(item => allowed.has(item))
      return fits
        ? null
        : `expected a non-empty list of distinct ${question.type === "multi"
          ? "option"
          : "region"} IDs`
    }
    case "yes-no":
      return typeof value === "boolean"
        ? null
        : "expected true or false"
    case "scale":
      return typeof value === "number" && Number.isInteger(value) && value >= question.min && value <= question.max
        ? null
        : `expected a whole number from ${question.min} to ${question.max}`
  }
}

type WalkResult
  = | { status: "pending", question: string, known: Answers, trace: Array<TraceEntry> }
    | { status: "invalid", question: string, reason: string }
    | { status: "early-stop", flags: Array<Flag>, known: Answers, trace: Array<TraceEntry> }
    | { status: "complete", known: Answers, trace: Array<TraceEntry> }

function walk(
  questionnaire: Questionnaire,
  safetyRules: ReadonlyArray<SafetyRule>,
  regionIds: ReadonlySet<string>,
  answers: Answers,
): WalkResult {
  const questions = new Map(questionnaire.questions.map(question => [question.id, question]))
  const earlyStopRules = safetyRules.filter(rule => rule.earlyStop)
  const known: Record<string, AnswerValue> = {}
  const trace: Array<TraceEntry> = []
  let current = questionnaire.start

  // The bundle is checked to be acyclic; this bound is a second guard.
  for (let steps = 0; steps <= questions.size; steps++) {
    if (current === "complete") {
      return { status: "complete", known, trace }
    }
    const question = questions.get(current)
    if (question === undefined) {
      throw new Error(`Unknown question "${current}": the bundle wasn't validated.`)
    }

    const value = answers[current]
    if (value === undefined) {
      return {
        status: "pending",
        question: current,
        known,
        trace,
      }
    }
    const problem = answerProblem(question, value, regionIds)
    if (problem !== null) {
      return { status: "invalid", question: current, reason: problem }
    }
    known[current] = value
    trace.push({ kind: "answer", question: current })

    const stopping = earlyStopRules.filter(rule => holds(rule.when, known))
    if (stopping.length > 0) {
      const flags = stopping.map(rule => ({ ruleId: rule.id, severity: rule.severity }))
      for (const flag of flags) {
        trace.push({ kind: "safety", ...flag })
      }
      trace.push({
        kind: "early-stop",
        ruleIds: flags.map(flag => flag.ruleId),
      })
      return {
        status: "early-stop",
        flags,
        known,
        trace,
      }
    }

    const edgeIndex = question.next.findIndex(edge => edge.when === undefined || holds(edge.when, known))
    const edge = question.next[edgeIndex]
    if (edge === undefined) {
      throw new Error(`Question "${current}" has no matching edge: the bundle wasn't validated.`)
    }
    trace.push({
      kind: "edge",
      from: current,
      to: edge.goto,
      edge: edgeIndex,
    })
    current = edge.goto
  }
  throw new Error("The questionnaire didn't finish: the bundle wasn't validated.")
}

/** Every safety rule that holds on the known answers, in content order. */
function matchingFlags(safetyRules: ReadonlyArray<SafetyRule>, known: Answers): Array<Flag> {
  return safetyRules
    .filter(rule => holds(rule.when, known))
    .map(rule => ({ ruleId: rule.id, severity: rule.severity }))
}

export {
  answerProblem,
  matchingFlags,
  walk,
  type WalkResult,
}
