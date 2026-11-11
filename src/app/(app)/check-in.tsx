import { router } from "expo-router"

import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export default function CheckIn() {
  return (
    <PlaceholderScreen
      hasHeader
      title="Weekly check-in"
      description="The weekly questionnaire and red-flag re-screen will go here (M6)."
    >
      <Button onPress={() => router.dismiss()}>Submit</Button>
    </PlaceholderScreen>
  )
}
