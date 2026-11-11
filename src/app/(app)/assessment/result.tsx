import { router } from "expo-router"

import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export default function AssessmentResult() {
  return (
    <PlaceholderScreen
      hasHeader
      title="Your result"
      description="The eligible, see-a-clinician, and urgent result screens will go here (M4)."
    >
      {/* Closes the whole assessment modal, not just this screen. */}
      <Button onPress={() => router.dismissTo("/")}>Done</Button>
    </PlaceholderScreen>
  )
}
