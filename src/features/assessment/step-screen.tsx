import type { ReactNode } from "react"

import { View } from "react-native"

import { Card } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { ProgressBar } from "@/components/ui/progress-bar"
import { useAssessment } from "@/features/assessment/use-assessment"

/** A warning on every assessment screen while the content isn't PT-approved. */
function DraftNotice() {
  const { draft } = useAssessment()
  if (!draft) {
    return null
  }
  return (
    <Card variant="caution" className="gap-0 py-2.5">
      <Text variant="footnote" tone="caution" className="font-semibold">DRAFT CONTENT</Text>
      <Text variant="footnote" tone="soft">These questions are placeholders and haven't been clinically reviewed.</Text>
    </Card>
  )
}

type StepScreenProps = {
  questionId: string
  prompt: string
  help?: string | undefined
  canContinue: boolean
  onContinue: () => void
  children: ReactNode
}

/** One assessment step: progress, the question, its answer control, and Continue. */
function StepScreen({ questionId, prompt, help, canContinue, onContinue, children }: StepScreenProps) {
  const { bundle, submitting } = useAssessment()
  const { questions } = bundle.assessment
  const index = questions.findIndex(question => question.id === questionId)

  return (
    <Screen
      hasHeader
      testID={`question-${questionId}`}
      footer={(
        <Button disabled={!canContinue} loading={submitting} onPress={onContinue}>
          Continue
        </Button>
      )}
    >
      <View className="gap-4">
        <DraftNotice />
        <View className="gap-2">
          <Text variant="footnote" tone="muted">{`Question ${index + 1} of about ${questions.length}`}</Text>
          <ProgressBar value={(index + 1) / questions.length} accessibilityLabel="Assessment progress" />
        </View>
        <View className="gap-1">
          <Text variant="title">{prompt}</Text>
          {help !== undefined && <Text tone="muted">{help}</Text>}
        </View>
      </View>
      {children}
    </Screen>
  )
}

export {
  DraftNotice,
  StepScreen,
  type StepScreenProps,
}
