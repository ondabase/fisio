import type { Bundle } from "@/clinical/schema/bundle"
import type { Answers, AnswerValue, Flag } from "@/clinical/engine/types"

import { createContext, use } from "react"

type Result = {
  outcome: "eligible" | "refer" | "urgent"
  flags: Array<Flag>
  trackId: string | null
  startPhase: string | null
  /** "server" once the server's evaluation arrives; "app" before that. */
  source: "app" | "server"
}

type AssessmentContextValue = {
  bundle: Bundle
  /** True when the content isn't PT-approved. */
  draft: boolean
  answers: Answers
  result: Result | null
  /** True while waiting for the server's result. */
  submitting: boolean
  /** Records an answer, saves, and moves to the next step. */
  answer: (questionId: string, value: AnswerValue) => void
}

const AssessmentContext = createContext<AssessmentContextValue | null>(null)

function useAssessment() {
  const context = use(AssessmentContext)
  if (context === null) {
    throw new Error("useAssessment must be used inside <AssessmentProvider>.")
  }
  return context
}

export {
  AssessmentContext,
  type AssessmentContextValue,
  type Result,
  useAssessment,
}
