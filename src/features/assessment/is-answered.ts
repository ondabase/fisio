import type { Question } from "@/clinical/schema/bundle"
import type { AnswerValue } from "@/clinical/engine/types"

/** Whether a value is a complete answer to the question, so Continue can be enabled. */
function isAnswered(question: Question, value: AnswerValue | undefined) {
  if (value === undefined) {
    return false
  }
  return question.type === "multi" || question.type === "body-map"
    ? Array.isArray(value) && value.length > 0
    : true
}

export { isAnswered }
