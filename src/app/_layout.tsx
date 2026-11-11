import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useEffect, useState } from "react"

import { ClerkProvider, useAuth, useClerk } from "@clerk/expo"
import { tokenCache } from "@clerk/expo/token-cache"
import { useQueryClient } from "@tanstack/react-query"
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"

import { useMe } from "@/features/account/use-me"
import { createQueryClient, persistOptions, queryPersister } from "@/lib/query-client"
import { AccountError } from "@/features/account/account-error"

import "@/styles/global.css"

// Expo inlines `EXPO_PUBLIC_*` variables only when they're read as a literal
// `process.env.NAME`, so this can't go through an import.
// eslint-disable-next-line no-restricted-globals, node/prefer-global/process
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""

if (publishableKey === "") {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Run `npx clerk@latest env pull`, then restart the dev server.")
}

// Keep the splash screen up until Clerk has restored any saved session and
// the user's record has loaded, so no screen flashes by on launch.
void SplashScreen.preventAutoHideAsync()

/**
 * Three mutually exclusive states, each with only its own screens reachable:
 * - Signed out: the auth screens.
 * - Signed in without the current consent: onboarding.
 * - Signed in with consent: the app.
 * When the state changes, Expo Router redirects to the group that's now
 * reachable. Legal pages stay reachable in every state.
 */
function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const queryClient = useQueryClient()
  const me = useMe()
  const signedIn = isSignedIn === true
  const consented = me.data?.hasCurrentConsent === true

  // Drop the previous user's cached data on sign-out, including the copy
  // saved on the device.
  useEffect(() => {
    if (isLoaded && !signedIn) {
      queryClient.clear()
      void queryPersister.removeClient()
    }
  }, [isLoaded, signedIn, queryClient])

  const ready = isLoaded && (!signedIn || me.data !== undefined || me.isError)

  useEffect(() => {
    if (ready) {
      SplashScreen.hide()
    }
  }, [ready])

  if (!ready) {
    return null
  }

  if (signedIn && me.data === undefined) {
    return (
      <AccountError
        retrying={me.isFetching}
        onRetry={() => void me.refetch()}
        onSignOut={() => void signOut()}
      />
    )
  }

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Protected guard={signedIn && consented} redirectTo={signedIn ? "/onboarding/consent" : "/welcome"}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !consented} redirectTo={signedIn ? "/" : "/welcome"}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn} redirectTo="/">
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient)

  return (
    // The token cache (expo-secure-store) is native only, so it's undefined on web.
    <ClerkProvider publishableKey={publishableKey} {...(tokenCache !== undefined && { tokenCache })}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <RootNavigator />
      </PersistQueryClientProvider>
    </ClerkProvider>
  )
}
