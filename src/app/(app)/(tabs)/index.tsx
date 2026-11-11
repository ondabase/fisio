import { router } from "expo-router"

import { Text } from "@/components/ui/text"
import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

/*
 * Today will show the single next action: a session, the weekly check-in, or
 * a reassessment (M5). Until then it links to every placeholder flow so each
 * route can be opened in the app.
 */
export default function Today() {
  return (
    <PlaceholderScreen
      title="Today"
      description="Your daily session and next steps will show up here."
    >
      <Text variant="footnote" tone="muted" className="font-semibold uppercase tracking-wide">
        Placeholder flows
      </Text>
      <Button onPress={() => router.push("/assessment/body-map")}>Start assessment</Button>
      <Button variant="secondary" onPress={() => router.push("/session/demo")}>Start session</Button>
      <Button variant="secondary" onPress={() => router.push("/check-in")}>Weekly check-in</Button>
      <Button variant="secondary" onPress={() => router.push("/paywall")}>Paywall</Button>
      <Button variant="outline" onPress={() => router.push("/onboarding/consent")}>Onboarding</Button>
    </PlaceholderScreen>
  )
}
