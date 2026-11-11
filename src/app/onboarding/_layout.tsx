import { Stack } from "expo-router"

/*
 * First-run steps after sign-in. Consent is the only step for now; the
 * onboarding profile joins once the PT confirms which fields are clinically
 * needed (assumption A3).
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="consent" options={{ title: "Before you start" }} />
    </Stack>
  )
}
