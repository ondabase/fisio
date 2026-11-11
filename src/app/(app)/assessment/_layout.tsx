import { Stack } from "expo-router"

/* The assessment flow: body map, then one question per screen, then the result. */
export default function AssessmentLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="body-map" options={{ title: "Where does it hurt?" }} />
      <Stack.Screen name="question/[id]" options={{ title: "Assessment" }} />
      {/* The outcome is final once shown, so there's no going back into the questions. */}
      <Stack.Screen name="result" options={{ title: "Your result", headerBackVisible: false, gestureEnabled: false }} />
    </Stack>
  )
}
