import { Stack } from "expo-router"

/* The signed-in app: the tabs, and later the modals that open above them. */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}
