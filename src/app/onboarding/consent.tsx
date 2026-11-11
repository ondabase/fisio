import { router } from "expo-router"

import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export default function Consent() {
  return (
    <PlaceholderScreen
      hasHeader
      title="Your health data"
      description="Versioned health-data consent and the 18+ attestation will go here. Agreeing is stored server-side."
    >
      <Button onPress={() => router.push("/onboarding/profile")}>I agree</Button>
    </PlaceholderScreen>
  )
}
