import type { Bundle } from "@/clinical/schema/bundle"
import type { ProgramSummary } from "@/lib/contracts/program"

import { router } from "expo-router"
import { ActivityIndicator, View } from "react-native"

import { Card } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { ListGroup, ListRow } from "@/components/ui/list-row"
import { describeDose } from "@/features/program/dose"
import { useContentVersion, useProgram } from "@/features/program/api"

function ProgramDetails({ program, bundle }: { program: ProgramSummary, bundle: Bundle }) {
  const track = bundle.tracks.find(candidate => candidate.id === program.trackId)
  if (track === undefined) {
    return <Text tone="muted">This program's content isn't available.</Text>
  }
  const current = track.phases.find(phase => phase.id === program.currentPhase)
  const exercises = new Map(bundle.exercises.map(exercise => [exercise.id, exercise]))
  const used = [
    ...new Set(track.phases.flatMap(phase => phase.sessions.flatMap(session => session.doses.map(dose => dose.exercise)))),
  ]

  return (
    <>
      <Card variant="primary">
        <Text variant="heading" tone="primary">{track.title}</Text>
        <Text variant="callout" tone="soft">{track.summary}</Text>
      </Card>

      <View className="gap-2">
        <Text variant="subheading">Phases</Text>
        <ListGroup>
          {track.phases.map((phase, index) => {
            const isCurrent = phase.id === program.currentPhase
            return (
              <ListRow
                key={phase.id}
                title={`${index + 1}. ${phase.title}`}
                description={phase.summary}
                {...(isCurrent && { value: "Current" })}
                leading={(
                  <Icon
                    name={isCurrent
                      ? { ios: "circle.inset.filled", android: "radio_button_checked", web: "radio_button_checked" }
                      : { ios: "circle", android: "radio_button_unchecked", web: "radio_button_unchecked" }}
                    size={20}
                    className={isCurrent ? "text-primary" : "text-muted-foreground"}
                  />
                )}
              />
            )
          })}
        </ListGroup>
        <Text variant="footnote" tone="muted">Your weekly check-in moves you to the next phase when you're ready.</Text>
      </View>

      {current !== undefined && (
        <View className="gap-2">
          <Text variant="subheading">{`This phase's sessions`}</Text>
          {current.sessions.map(session => (
            <ListGroup key={session.id}>
              <ListRow
                title={session.title}
                description={`${session.doses.length} exercises`}
                onPress={() => router.push({
                  pathname: "/session/[id]",
                  params: { id: session.id },
                })}
              />
              {session.doses.map((dose, position) => (
                <ListRow
                  // Doses have no ID; their position in the session is stable.
                  // eslint-disable-next-line react/no-array-index-key
                  key={position}
                  title={exercises.get(dose.exercise)?.name ?? dose.exercise}
                  value={describeDose(dose)}
                />
              ))}
            </ListGroup>
          ))}
        </View>
      )}

      <View className="gap-2">
        <Text variant="subheading">Exercise library</Text>
        <ListGroup>
          {used.map((id) => {
            const exercise = exercises.get(id)
            return exercise === undefined
              ? null
              : <ListRow key={id} title={exercise.name} description={exercise.cues.join(" ")} />
          })}
        </ListGroup>
      </View>
    </>
  )
}

/** Program: the whole plan, phase by phase. */
export default function Program() {
  const program = useProgram()
  const active = program.data?.status === "active"
    ? program.data
    : undefined
  const content = useContentVersion(active?.contentVersionId)

  let body
  if (active !== undefined && content.data !== undefined) {
    body = <ProgramDetails program={active} bundle={content.data.bundle} />
  }
  else if (program.data === undefined || (active !== undefined && content.data === undefined)) {
    body = program.isError || content.isError
      ? <Text tone="muted">Couldn't load your program. Check your connection and try again.</Text>
      : <ActivityIndicator className="mt-8" accessibilityLabel="Loading your program" />
  }
  else {
    body = (
      <Card>
        <Text variant="subheading">No active program</Text>
        <Text variant="callout" tone="soft">Take the assessment to get a program built around your back.</Text>
        <Button className="mt-2" onPress={() => router.push("/assessment/body-map")}>Start the assessment</Button>
      </Card>
    )
  }

  return (
    <Screen>
      <View className="gap-1">
        <Text variant="display">Your program</Text>
        <Text tone="muted">A plan built around you.</Text>
      </View>
      <View className="gap-4">{body}</View>
    </Screen>
  )
}
