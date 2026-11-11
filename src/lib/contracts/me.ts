import { z } from "zod"

/*
 * Request and response shapes for /api/me, shared by the app and the API so
 * both sides validate the same contract. No server-only imports here: this
 * file is bundled into the app.
 */

const meSchema = z.object({
  id: z.uuid(),
  consentVersion: z.string().nullable(),
  consentedAt: z.iso.datetime({ offset: true }).nullable(),
  /** True when the user agreed to the consent version the app currently shows. */
  hasCurrentConsent: z.boolean(),
})

type Me = z.infer<typeof meSchema>

const consentRequestSchema = z.object({
  /** The version of the consent text the user saw and agreed to. */
  consentVersion: z.string().min(1),
  /** The user confirmed they're 18 or older. Consent isn't valid without it. */
  adultAttested: z.literal(true),
})

type ConsentRequest = z.infer<typeof consentRequestSchema>

export {
  type ConsentRequest,
  consentRequestSchema,
  type Me,
  meSchema,
}
