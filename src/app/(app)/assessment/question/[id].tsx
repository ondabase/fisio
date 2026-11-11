import type { AnswerValue } from "@/clinical/engine/types"

import { useState } from "react"
import { useLocalSearchParams } from "expo-router"

import { StepScreen } from "@/features/assessment/step-screen"
import { useAssessment } from "@/features/assessment/use-assessment"
import { QuestionInput } from "@/features/assessment/question-input"
import { isAnswered } from "@/features/assessment/is-answered"

/** One question of the assessment, chosen by the engine. */
export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bundle, answers, answer } = useAssessment()
  const question = bundle.assessment.questions.find(candidate => candidate.id === id)
  const [value, setValue] = useState<AnswerValue | undefined>(answers[id])

  if (question === undefined || question.type === "body-map") {
    return null
  }

  return (
    <StepScreen
      questionId={question.id}
      prompt={question.prompt}
      help={question.help}
      canContinue={isAnswered(question, value)}
      onContinue={() => {
        if (value !== undefined) {
          answer(question.id, value)
        }
      }}
    >
      <QuestionInput question={question} value={value} onChange={setValue} />
    </StepScreen>
  )
}
