import { useState } from "react"

import { BodyMap } from "@/features/body-map/body-map"
import { StepScreen } from "@/features/assessment/step-screen"
import { useAssessment } from "@/features/assessment/use-assessment"

/** The body-map question, which starts the assessment. */
export default function BodyMapScreen() {
  const { bundle, answers, answer } = useAssessment()
  const question = bundle.assessment.questions.find(candidate => candidate.type === "body-map")
  const saved = question === undefined
    ? undefined
    : answers[question.id]
  const [regions, setRegions] = useState<Array<string>>(Array.isArray(saved)
    ? saved
    : [])

  if (question === undefined) {
    return null
  }

  return (
    <StepScreen
      questionId={question.id}
      prompt={question.prompt}
      help={question.help}
      canContinue={regions.length > 0}
      onContinue={() => answer(question.id, regions)}
    >
      <BodyMap regions={bundle.regions} value={regions} onChange={setRegions} />
    </StepScreen>
  )
}
