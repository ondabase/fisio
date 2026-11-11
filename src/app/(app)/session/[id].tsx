import { router, useLocalSearchParams } from "expo-router"

import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export default function Session() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <PlaceholderScreen
      hasHeader
      title="Session"
      description={`The player for session "${id}" will go here: video, set and rep counter, hold timer, and stop rules (M5).`}
    >
      <Button onPress={() => router.dismiss()}>Mark done</Button>
      <Button variant="outline" onPress={() => router.dismiss()}>Close</Button>
    </PlaceholderScreen>
  )
}
