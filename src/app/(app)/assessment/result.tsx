import type { Result } from "@/features/assessment/use-assessment"

import { router } from "expo-router"
import { Linking, View } from "react-native"

import { Card } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { DraftNotice } from "@/features/assessment/step-screen"
import { useAssessment } from "@/features/assessment/use-assessment"

/*
 * The assessment result. Copy is non-diagnostic by design (PLAN.md §1):
 * it says what to do, never what condition the user might have.
 */

function done() {
  router.dismissTo("/")
}

function callEmergency() {
  void Linking.openURL("tel:911")
}

function Urgent() {
  return (
    <Screen
      hasHeader
      footer={(
        <>
          <Button variant="destructive" size="lg" onPress={callEmergency}>
            <ButtonIcon name={{ ios: "phone.fill", android: "call", web: "call" }} />
            <ButtonText>Call 911</ButtonText>
          </Button>
          <Button variant="ghost" onPress={done}>Close</Button>
        </>
      )}
    >
      <DraftNotice />
      <View className="gap-3">
        <Icon name={{ ios: "exclamationmark.circle.fill", android: "error", web: "error" }} size={44} className="text-urgent" />
        <Text variant="title">Get medical care now</Text>
        <Text>
          Your answers could be a sign of a serious problem that needs immediate medical attention. Please don't start exercises.
        </Text>
      </View>
      <Card variant="urgent">
        <Text variant="subheading" tone="urgent">What to do</Text>
        <Text variant="callout" tone="soft">Call 911, or go to the nearest emergency department right away.</Text>
        <Text variant="callout" tone="soft">If symptoms like numbness in the groin or loss of bladder or bowel control appear, treat them as an emergency.</Text>
      </Card>
    </Screen>
  )
}

function Refer() {
  return (
    <Screen hasHeader footer={<Button onPress={done}>Done</Button>}>
      <DraftNotice />
      <View className="gap-3">
        <Icon name={{ ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" }} size={44} className="text-caution" />
        <Text variant="title">Check in with a healthcare provider first</Text>
        <Text>
          Based on your answers, it's a good idea to speak with a healthcare professional, such as a primary care provider or physical therapist, before starting an exercise program.
        </Text>
      </View>
      <Card variant="caution">
        <Text variant="subheading" tone="caution">This is a precaution</Text>
        <Text variant="callout" tone="soft">It keeps you safe and makes sure you get the right care. Once a clinician says exercise is right for you, you can take the assessment again.</Text>
      </Card>
      <Card>
        <Text variant="subheading">In the meantime</Text>
        <Text variant="callout" tone="soft">Gentle walking and staying as active as is comfortable usually helps back pain. Seek care right away if your symptoms get much worse.</Text>
      </Card>
    </Screen>
  )
}

function Eligible({ result }: { result: Result }) {
  const { bundle } = useAssessment()
  const track = bundle.tracks.find(candidate => candidate.id === result.trackId)
  const phase = track?.phases.find(candidate => candidate.id === result.startPhase)

  return (
    <Screen hasHeader footer={<Button onPress={done}>Continue to your program</Button>}>
      <DraftNotice />
      <View className="gap-3">
        <Icon name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }} size={44} className="text-success" />
        <Text variant="title">You're a good fit for a home program</Text>
        <Text>Based on your responses, it's safe to continue with a personalized exercise program for your back.</Text>
      </View>
      {track !== undefined && (
        <Card variant="success">
          <Text variant="footnote" tone="success" className="font-semibold uppercase">Your program</Text>
          <Text variant="subheading">{track.title}</Text>
          <Text variant="callout" tone="soft">{track.summary}</Text>
          {phase !== undefined && (
            <Text variant="callout" tone="soft">{`You'll start with "${phase.title}": ${phase.summary}`}</Text>
          )}
        </Card>
      )}
      <Text variant="footnote" tone="muted">
        Stop any exercise that causes new numbness, tingling, or weakness, and seek care if your symptoms get much worse.
      </Text>
    </Screen>
  )
}

export default function AssessmentResult() {
  const { result } = useAssessment()

  if (result === null) {
    return null
  }
  switch (result.outcome) {
    case "urgent":
      return <Urgent />
    case "refer":
      return <Refer />
    case "eligible":
      return <Eligible result={result} />
  }
}
