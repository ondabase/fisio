import { useState } from "react"
import { Alert } from "react-native"

import { isClerkAPIResponseError, useSSO } from "@clerk/expo"

function errorMessage(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    const first = error.errors[0]
    return first?.longMessage ?? first?.message ?? error.message
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again."
}

/**
 * Google sign-in through Clerk's browser flow. One combined flow: it signs in
 * existing users and creates an account for new ones. Works in Expo Go and
 * uses Clerk's shared Google credentials in development, so no Google Cloud
 * setup is needed until production.
 *
 * Navigation isn't handled here: once the session is active, the root
 * layout's auth guard swaps the auth screens for the app.
 */
function useGoogleSignIn() {
  const { startSSOFlow } = useSSO()
  const [pending, setPending] = useState(false)

  async function signInWithGoogle() {
    if (pending) {
      return
    }
    setPending(true)
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy: "oauth_google" })
      // No session means the user closed the browser sheet: not an error.
      if (createdSessionId !== null && setActive !== undefined) {
        await setActive({ session: createdSessionId })
      }
    }
    catch (error) {
      Alert.alert("Couldn't sign in", errorMessage(error))
    }
    finally {
      setPending(false)
    }
  }

  return { pending, signInWithGoogle }
}

export { useGoogleSignIn }
