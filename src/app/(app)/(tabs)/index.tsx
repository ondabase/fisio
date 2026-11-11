import type { Bundle } from "@/clinical/schema/bundle"
import type { ProgramSummary } from "@/lib/contracts/program"

import { router } from "expo-router"
import { useState } from "react"
import { ActivityIndicator, View } from "react-native"

import { Card } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Screen } from "@/components/ui/screen"
import { ProgressBar } from "@/components/ui/progress-bar"
import { ListGroup, ListRow } from "@/components/ui/list-row"
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button"
import { useContentVersion, useProgram } from "@/features/program/api"
import { daysActiveThisWeek, doneOn, localDate, nextSession } from "@/features/program/schedule"

function greeting(hour: number) {
  if (hour < 12) {
    return "Good morning"
  }
  return hour < 18
    ? "Good afternoon"
    : "Good evening"
}

function startAssessment() {
  router.push("/assessment/body-map")
}

function NoProgram() {
  return (
    <Card>
      <Text variant="subheading">Let's find the right program for you</Text>
      <Text variant="callout" tone="soft">A short assessment checks it's safe to start and builds a plan around your back.</Text>
      <Button className="mt-2" onPress={startAssessment}>Start the assessment</Button>
    </Card>
  )
}

function Referred() {
  return (
    <Card variant="caution">
      <Text variant="subheading" tone="caution">See a clinician before continuing</Text>
      <Text variant="callout" tone="soft">
        Your last assessment suggested checking in with a healthcare provider. Once you've been cleared for exercise, take the assessment again.
      </Text>
      <Button variant="outline" className="mt-2 bg-card" onPress={startAssessment}>Retake the assessment</Button>
    </Card>
  )
}

function ActiveProgram({ program, bundle, draft }: { program: ProgramSummary, bundle: Bundle, draft: boolean }) {
  const next = nextSession(bundle, program)
  if (next === null) {
    return <Text tone="muted">This program's content isn't available.</Text>
  }
  const today = localDate()
  const doneToday = doneOn(program.progress.recentDates, today)
  const { track, phase, phaseIndex, session } = next
  const activeDays = daysActiveThisWeek(program.progress.recentDates, today)
  const openSession = () => router.push({
    pathname: "/session/[id]",
    params: { id: session.id },
  })

  return (
    <>
      {draft && (
        <Card variant="caution" className="gap-0 py-2.5">
          <Text variant="footnote" tone="caution" className="font-semibold">DRAFT CONTENT</Text>
          <Text variant="footnote" tone="soft">This program is placeholder content that hasn't been clinically reviewed.</Text>
        </Card>
      )}

      <Card variant={doneToday ? "success" : "default"}>
        <Text variant="footnote" tone={doneToday ? "success" : "muted"} className="font-semibold uppercase">
          {doneToday ? "Done for today" : "Today's focus"}
        </Text>
        <Text variant="heading">{session.title}</Text>
        <Text variant="callout" tone="soft">{`${session.doses.length} exercises · ${phase.title}`}</Text>
        {doneToday
          ? (
              <View className="mt-2 gap-2">
                <View className="flex-row items-center gap-2">
                  <Icon name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }} size={20} className="text-success" />
                  <Text variant="callout" className="flex-1">Nice work. Rest up and come back tomorrow.</Text>
                </View>
                <Button variant="outline" className="bg-card" onPress={openSession}>Do another session</Button>
              </View>
            )
          : (
              <Button className="mt-2" onPress={openSession}>
                <ButtonIcon name={{ ios: "play.fill", android: "play_arrow", web: "play_arrow" }} />
                <ButtonText>Start today's session</ButtonText>
              </Button>
            )}
      </Card>

      <Card>
        <Text variant="footnote" tone="muted" className="font-semibold uppercase">Your program</Text>
        <Text variant="subheading">{track.title}</Text>
        <Text variant="callout" tone="soft">{`Phase ${phaseIndex + 1} of ${track.phases.length}: ${phase.title}`}</Text>
        <ProgressBar className="mt-1" value={(phaseIndex + 1) / track.phases.length} accessibilityLabel="Program progress" />
        <Text variant="footnote" tone="muted">{`Active ${activeDays} of the last 7 days`}</Text>
      </Card>

      <ListGroup>
        <ListRow
          title="Weekly check-in"
          description="Check in on your pain and how you're doing."
          leading={<Icon name={{ ios: "calendar", android: "calendar_month", web: "calendar_month" }} size={22} className="text-primary" />}
          onPress={() => router.push("/check-in")}
        />
      </ListGroup>
    </>
  )
}

/** Today: the single next thing to do. */
export default function Today() {
  // Read once per mount, so rendering stays pure.
  const [hour] = useState(() => new Date().getHours())
  const program = useProgram()
  const active = program.data?.status === "active"
    ? program.data
    : undefined
  const content = useContentVersion(active?.contentVersionId)
  const loading = program.data === undefined || (active !== undefined && content.data === undefined)
  const failed = program.isError || content.isError

  let body
  if (active !== undefined && content.data !== undefined) {
    body = <ActiveProgram program={active} bundle={content.data.bundle} draft={content.data.draft} />
  }
  else if (loading && failed) {
    body = (
      <Card>
        <Text variant="subheading">Couldn't load your program</Text>
        <Text variant="callout" tone="soft">Check your connection and try again.</Text>
        <Button variant="outline" className="mt-2" onPress={() => void program.refetch()}>Try again</Button>
      </Card>
    )
  }
  else if (loading) {
    body = <ActivityIndicator className="mt-8" accessibilityLabel="Loading your program" />
  }
  else if (program.data?.status === "stopped_referred") {
    body = <Referred />
  }
  else {
    body = <NoProgram />
  }

  return (
    <Screen>
      <View className="gap-1">
        <Text variant="display">{greeting(hour)}</Text>
        <Text tone="muted">Let's keep moving.</Text>
      </View>
      <View className="gap-4">{body}</View>
    </Screen>
  )
}
