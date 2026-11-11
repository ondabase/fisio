import { router } from "expo-router"

import { Button } from "@/components/ui/button"
import { PlaceholderScreen } from "@/components/placeholder-screen"

export default function BodyMap() {
  return (
    <PlaceholderScreen
      hasHeader
      title="Where does it hurt?"
      description="The front and back body map will go here (M3). Selected regions start the adaptive questions."
    >
      <Button onPress={() => router.push("/assessment/question/q1")}>Continue</Button>
      {/* First screen of the assessment stack, so back closes the modal. */}
      <Button variant="outline" onPress={() => router.back()}>Close</Button>
    </PlaceholderScreen>
  )
}
