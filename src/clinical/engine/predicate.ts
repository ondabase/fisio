import type { Answers } from "@/clinical/engine/types"
import type { Predicate } from "@/clinical/schema/predicate"

/**
 * Evaluates a rule against known answers. A leaf about an unanswered
 * question is false. Answer types are already validated by the walk, so a
 * mismatched type also reads as false rather than throwing.
 */
function holds(predicate: Predicate, answers: Answers): boolean {
  switch (predicate.op) {
    case "all":
      return predicate.of.every(child => holds(child, answers))
    case "any":
      return predicate.of.some(child => holds(child, answers))
    case "not":
      return !holds(predicate.of, answers)
    case "eq":
      return answers[predicate.question] === predicate.value
    case "in": {
      const answer = answers[predicate.question]
      return typeof answer === "string" && predicate.values.includes(answer)
    }
    case "includes": {
      const answer = answers[predicate.question]
      return Array.isArray(answer) && predicate.anyOf.some(value => answer.includes(value))
    }
    case "gte": {
      const answer = answers[predicate.question]
      return typeof answer === "number" && answer >= predicate.value
    }
    case "lte": {
      const answer = answers[predicate.question]
      return typeof answer === "number" && answer <= predicate.value
    }
  }
}

export { holds }
