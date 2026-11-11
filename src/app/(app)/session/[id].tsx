import type { SessionLogRequest } from "@/lib/contracts/program"

import { randomUUID } from "expo-crypto"
import { useState } from "react"
import { Alert, Pressable, View } from "react-native"
import { router, Stack, useLocalSearchParams } from "expo-router"

import { Card } from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { ProgressBar } from "@/components/ui/progress-bar"
import { ScalePicker } from "@/components/ui/scale-picker"
import { localDate } from "@/features/program/schedule"
import { HoldTimer } from "@/features/session/hold-timer"
import { describeDose } from "@/features/program/dose"
import { useContentVersion, useLogSession, useProgram } from "@/features/program/api"

/*
 * The session player: one exercise at a time (video, cues, sets, holds, and
 * when to stop), then a pain rating. Finishing saves the session to the
 * offline outbox first, so it works without a network.
 */

type ExerciseProgress = { setsDone: number, skipped: boolean }

function leave() {
  router.dismissTo("/")
}

function confirmLeave() {
  Alert.alert("End this session?", "Your progress in this session won't be saved.", [
    { text: "Keep going", style: "cancel" },
    { text: "End session", style: "destructive", onPress: leave },
  ])
}

function CloseButton() {
  return (
    <Pressable role="button" accessibilityLabel="End the session" onPress={confirmLeave} hitSlop={12}>
      <Text className="font-semibold text-accent">Close</Text>
    </Pressable>
  )
}

function VideoPlaceholder() {
  return (
    <View
      className="aspect-video items-center justify-center gap-2 rounded-card bg-secondary"
      accessibilityLabel="Exercise video coming soon"
    >
      <Icon name={{ ios: "play.rectangle", android: "smart_display", web: "smart_display" }} size={36} className="text-muted-foreground" />
      <Text variant="footnote" tone="muted">Video coming soon</Text>
    </View>
  )
}

export default function SessionPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const program = useProgram()
  const active = program.data?.status === "active"
    ? program.data
    : undefined
  const content = useContentVersion(active?.contentVersionId)
  const logSession = useLogSession()

  const [step, setStep] = useState(0)
  const [progress, setProgress] = useState<Array<ExerciseProgress>>([])
  const [pain, setPain] = useState<number | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  // One ID per run of the player, so a repeated Finish (a double tap, or a
  // retry after an error) records this session once.
  const [logId] = useState(() => randomUUID())
  const [finished, setFinished] = useState(false)

  const bundle = content.data?.bundle
  const track = bundle?.tracks.find(candidate => candidate.id === active?.trackId)
  const phase = track?.phases.find(candidate => candidate.sessions.some(session => session.id === id))
  const session = phase?.sessions.find(candidate => candidate.id === id)

  if (active === undefined || bundle === undefined || phase === undefined || session === undefined) {
    return (
      <Screen hasHeader footer={<Button variant="outline" onPress={leave}>Close</Button>}>
        <Text tone="muted">
          {program.isPending || content.isPending
            ? "Loading your session…"
            : "This session isn't available."}
        </Text>
      </Screen>
    )
  }

  const { doses } = session
  const exercises = new Map(bundle.exercises.map(exercise => [exercise.id, exercise]))
  const progressAt = (index: number): ExerciseProgress => progress[index] ?? { setsDone: 0, skipped: false }
  const update = (index: number, next: ExerciseProgress) => {
    setProgress((current) => {
      const copy = [...current]
      copy[index] = next
      return copy
    })
  }

  async function finish() {
    if (active === undefined || phase === undefined || session === undefined || pain === undefined) {
      return
    }
    const log: SessionLogRequest = {
      id: logId,
      programId: active.id,
      sessionId: session.id,
      phaseId: phase.id,
      scheduledDate: localDate(),
      completedAt: new Date().toISOString(),
      painAfter: pain,
      exercises: doses.map((dose, position) => {
        const done = progressAt(position)
        return {
          position,
          exerciseId: dose.exercise,
          completed: !done.skipped && done.setsDone >= dose.sets,
          setsDone: done.setsDone,
        }
      }),
    }
    setSaving(true)
    try {
      await logSession(log)
      setFinished(true)
    }
    catch {
      Alert.alert("Couldn't save your session", "Please try again.")
    }
    finally {
      setSaving(false)
    }
  }

  if (finished) {
    const completed = doses.filter((dose, position) => !progressAt(position).skipped && progressAt(position).setsDone >= dose.sets).length
    return (
      <Screen hasHeader footer={<Button onPress={leave}>Back to Today</Button>}>
        <Stack.Screen options={{
          headerRight: () => null,
          headerBackVisible: false,
        }}
        />
        <View className="items-center gap-3 pt-8">
          <Icon name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }} size={64} className="text-success" />
          <Text variant="title" className="text-center">Session complete!</Text>
          <Text tone="muted" className="text-center">{`You finished ${completed} of ${doses.length} exercises.`}</Text>
        </View>
        <Card variant="primary">
          <Text variant="subheading" tone="primary">Every step counts</Text>
          <Text variant="callout" tone="soft">Regular, gentle movement is what helps most. See you next time.</Text>
        </Card>
      </Screen>
    )
  }

  // The last step is the pain rating.
  if (step >= doses.length) {
    return (
      <Screen
        hasHeader
        footer={(
          <>
            <Button disabled={pain === undefined} loading={saving} onPress={() => void finish()}>Finish session</Button>
            <Button variant="ghost" onPress={() => setStep(doses.length - 1)}>Back</Button>
          </>
        )}
      >
        <Stack.Screen options={{ headerRight: CloseButton }} />
        <View className="gap-1">
          <Text variant="title">How's your back right now?</Text>
          <Text tone="muted">Rate your pain after the session.</Text>
        </View>
        <ScalePicker
          min={0}
          max={10}
          minLabel="No pain"
          maxLabel="Worst pain imaginable"
          value={pain}
          onChange={setPain}
          accessibilityLabel="Pain after the session"
        />
      </Screen>
    )
  }

  const dose = doses[step]
  const exercise = dose === undefined
    ? undefined
    : exercises.get(dose.exercise)
  if (dose === undefined || exercise === undefined) {
    return null
  }
  const current = progressAt(step)
  const allSetsDone = current.setsDone >= dose.sets
  const next = () => setStep(step + 1)

  return (
    <Screen
      hasHeader
      footer={(
        <>
          <Button
            onPress={() => {
              if (allSetsDone) {
                next()
              }
              else {
                update(step, { ...current, setsDone: current.setsDone + 1 })
              }
            }}
          >
            {allSetsDone
              ? (step === doses.length - 1
                  ? "Finish exercises"
                  : "Next exercise")
              : `Set ${current.setsDone + 1} done`}
          </Button>
          {!allSetsDone && (
            <Button
              variant="ghost"
              onPress={() => {
                update(step, { ...current, skipped: true })
                next()
              }}
            >
              Skip this exercise
            </Button>
          )}
        </>
      )}
    >
      <Stack.Screen options={{ headerRight: CloseButton, title: session.title }} />
      <View className="gap-2">
        <Text variant="footnote" tone="muted">{`Exercise ${step + 1} of ${doses.length}`}</Text>
        <ProgressBar value={step / doses.length} accessibilityLabel="Session progress" />
      </View>

      <VideoPlaceholder />

      <View className="gap-1">
        <Text variant="title">{exercise.name}</Text>
        <Text tone="soft">{describeDose(dose)}</Text>
        <Text variant="callout" tone={allSetsDone ? "success" : "muted"}>
          {allSetsDone
            ? "All sets done"
            : `Set ${current.setsDone + 1} of ${dose.sets}`}
        </Text>
      </View>

      {dose.holdSeconds !== undefined && !allSetsDone && (
        // Keyed by set, so each set starts a fresh countdown.
        <HoldTimer key={`${step}-${current.setsDone}`} seconds={dose.holdSeconds} />
      )}

      <View className="gap-2">
        <Text variant="subheading">How to do it</Text>
        {exercise.cues.map((cue, index) => (
          <View key={cue} className="flex-row gap-2">
            <Text tone="muted">{`${index + 1}.`}</Text>
            <Text className="flex-1">{cue}</Text>
          </View>
        ))}
      </View>

      <Card variant="caution">
        <Text variant="subheading" tone="caution">When to stop</Text>
        {exercise.stopRules.map(rule => (
          <Text key={rule} variant="callout" tone="soft">{`• ${rule}`}</Text>
        ))}
      </Card>
    </Screen>
  )
}
