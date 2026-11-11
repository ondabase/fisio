import { Stack } from "expo-router"

import { useSessionSync } from "@/features/program/api"

/*
 * The signed-in app: the tabs, with the modal flows that open above them.
 * Assessment and the session player are full screen and can't be swiped
 * away, so a half-finished flow is only left on purpose.
 */
export default function AppLayout() {
  // Sends sessions completed offline whenever the app is open and online.
  useSessionSync()

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="assessment"
        options={{ presentation: "fullScreenModal", gestureEnabled: false }}
      />
      <Stack.Screen
        name="session/[id]"
        options={{
          presentation: "fullScreenModal",
          gestureEnabled: false,
          headerShown: true,
          title: "Session",
        }}
      />
      <Stack.Screen
        name="check-in"
        options={{ presentation: "modal", headerShown: true, title: "Weekly check-in" }}
      />
      <Stack.Screen
        name="paywall"
        options={{ presentation: "modal", headerShown: true, title: "Fisio Plus" }}
      />
    </Stack>
  )
}
