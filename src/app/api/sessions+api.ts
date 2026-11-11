import { withUser } from "@/server/auth"
import { recordSession } from "@/server/programs"
import { errorResponse, parseJsonBody } from "@/server/http"
import { sessionLogRequestSchema } from "@/lib/contracts/program"

/**
 * Records a completed session. Idempotent by the app-generated ID: sending
 * the same log again (such as an offline retry) returns 200 without a copy.
 */
export const POST = withUser(async ({ request, user, db }) => {
  const body = await parseJsonBody(request, sessionLogRequestSchema)
  if (!body.ok) {
    return body.response
  }
  const result = await recordSession(db, user, body.data)
  if (!result.ok) {
    return errorResponse(result.status, result.code, result.message)
  }
  return Response.json({ id: body.data.id, created: result.created }, {
    status: result.created ? 201 : 200,
  })
})
