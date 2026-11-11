import { Stack } from "expo-router"

/* First-run steps after sign-in: consent, then the onboarding profile. */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="consent" options={{ title: "Your health data" }} />
      <Stack.Screen name="profile" options={{ title: "About you" }} />
    </Stack>
  )
}
