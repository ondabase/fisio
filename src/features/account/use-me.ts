import type { Me } from "@/lib/contracts/me"

import { useAuth } from "@clerk/expo"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useApi } from "@/lib/api"
import { meSchema } from "@/lib/contracts/me"
import { CURRENT_CONSENT_VERSION } from "@/lib/consent"

/* Keyed by Clerk user, so one user's cached record never shows for another. */
function meQueryKey(userId: string | null | undefined) {
  return ["me", userId ?? "signed-out"] as const
}

/** The signed-in user's record. Disabled while signed out. */
function useMe() {
  const { isSignedIn, userId } = useAuth()
  const api = useApi()

  return useQuery({
    queryKey: meQueryKey(userId),
    queryFn: async () => api({ path: "/api/me", schema: meSchema }),
    enabled: isSignedIn === true,
    // Saved on the device, so the app opens past the consent check offline.
    meta: { persist: true },
  })
}

/**
 * Records consent to the current version with the 18+ attestation. On
 * success the cached record updates, which moves the root layout's guard
 * from onboarding to the app.
 */
function useRecordConsent() {
  const { userId } = useAuth()
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => api({
      path: "/api/me/consent",
      schema: meSchema,
      method: "POST",
      body: { consentVersion: CURRENT_CONSENT_VERSION, adultAttested: true },
    }),
    onSuccess: (me: Me) => {
      queryClient.setQueryData(meQueryKey(userId), me)
    },
  })
}

export {
  meQueryKey,
  useMe,
  useRecordConsent,
}
