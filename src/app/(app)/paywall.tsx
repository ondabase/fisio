import { router } from "expo-router"

import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export default function Paywall() {
  return (
    <PlaceholderScreen
      hasHeader
      title="Fisio Plus"
      description="The subscription offer with the 7-day trial and restore purchases will go here (M7)."
    >
      <Button onPress={() => router.dismiss()}>Not now</Button>
    </PlaceholderScreen>
  )
}
