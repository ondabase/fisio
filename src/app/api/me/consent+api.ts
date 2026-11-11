import { withUser } from "@/server/auth"
import { CURRENT_CONSENT_VERSION } from "@/lib/consent"
import { consentRequestSchema } from "@/lib/contracts/me"
import { errorResponse, parseJsonBody } from "@/server/http"
import { recordConsent, toMe } from "@/server/users"

/**
 * Records the user's agreement to the current consent text and their 18+
 * attestation. Rejects an outdated version, so the user never agrees to text
 * they weren't shown.
 */
export const POST = withUser(async ({ request, user, db }) => {
  const body = await parseJsonBody(request, consentRequestSchema)
  if (!body.ok) {
    return body.response
  }
  if (body.data.consentVersion !== CURRENT_CONSENT_VERSION) {
    return errorResponse(409, "conflict", "The consent text has changed. Review the latest version.")
  }

  const updated = await recordConsent(db, user.id)
  return Response.json(toMe(updated))
})
