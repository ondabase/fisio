import { useEffect, useState } from "react"
import { View } from "react-native"
import * as Haptics from "expo-haptics"

import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { clock } from "@/features/session/clock"

const TICK_MS = 250

type HoldTimerProps = {
  seconds: number
}

/**
 * A countdown for a hold or a timed exercise, with start, pause, and reset.
 * It counts toward an end time rather than ticking down, so it stays right
 * even if the app is briefly in the background. A haptic marks the end.
 */
function HoldTimer({ seconds }: HoldTimerProps) {
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [pausedAt, setPausedAt] = useState(seconds)
  const [now, setNow] = useState(0)

  const running = endsAt !== null
  const remaining = endsAt === null
    ? pausedAt
    : Math.max(0, Math.ceil((endsAt - now) / 1000))

  useEffect(() => {
    if (endsAt === null) {
      return
    }
    const interval = setInterval(() => {
      const time = Date.now()
      setNow(time)
      if (time >= endsAt) {
        setEndsAt(null)
        setPausedAt(0)
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [endsAt])

  function start() {
    const time = Date.now()
    setNow(time)
    setEndsAt(time + (pausedAt === 0
      ? seconds
      : pausedAt) * 1000)
  }

  function pause() {
    setPausedAt(remaining)
    setEndsAt(null)
  }

  function reset() {
    setEndsAt(null)
    setPausedAt(seconds)
  }

  return (
    <View className="items-center gap-3">
      <Text variant="display" role="timer" aria-live="polite" accessibilityLabel={`${clock(remaining)} remaining`}>
        {clock(remaining)}
      </Text>
      <View className="flex-row gap-3">
        <Button variant={running ? "secondary" : "default"} onPress={running ? pause : start}>
          {running
            ? "Pause"
            : (remaining === seconds
                ? "Start timer"
                : (remaining === 0
                    ? "Again"
                    : "Resume"))}
        </Button>
        {remaining !== seconds && (
          <Button variant="outline" onPress={reset}>Reset</Button>
        )}
      </View>
    </View>
  )
}

export {
  HoldTimer,
  type HoldTimerProps,
}
