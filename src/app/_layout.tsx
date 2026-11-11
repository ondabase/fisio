import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useEffect } from "react"

import { ClerkProvider, useAuth } from "@clerk/expo"
import { tokenCache } from "@clerk/expo/token-cache"

import "@/styles/global.css"

// Expo inlines `EXPO_PUBLIC_*` variables only when they're read as a literal
// `process.env.NAME`, so this can't go through an import.
// eslint-disable-next-line no-restricted-globals, node/prefer-global/process
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""

if (publishableKey === "") {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Run `npx clerk@latest env pull`, then restart the dev server.")
}

// Keep the splash screen up until Clerk has restored any saved session, so a
// signed-in user never sees the auth screen flash by.
void SplashScreen.preventAutoHideAsync()

/**
 * Signed out: only the auth screens are reachable. Signed in: only the app.
 * When the session changes, Expo Router redirects to the other group.
 * Legal pages and the button demo stay reachable either way.
 */
function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth()
  const signedIn = isSignedIn === true

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hide()
    }
  }, [isLoaded])

  if (!isLoaded) {
    return null
  }

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Protected guard={signedIn} redirectTo="/welcome">
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    // The token cache (expo-secure-store) is native only, so it's undefined on web.
    <ClerkProvider publishableKey={publishableKey} {...(tokenCache !== undefined && { tokenCache })}>
      <RootNavigator />
    </ClerkProvider>
  )
}
