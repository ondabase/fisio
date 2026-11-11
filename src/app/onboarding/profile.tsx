import { router } from "expo-router"

import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export default function OnboardingProfile() {
  return (
    <PlaceholderScreen
      hasHeader
      title="About you"
      description="The short onboarding profile will go here: only the fields the PT confirms are clinically needed."
    >
      <Button onPress={() => router.replace("/")}>Finish</Button>
    </PlaceholderScreen>
  )
}
