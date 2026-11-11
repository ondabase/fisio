import { withUser } from "@/server/auth"
import { submitAssessment } from "@/server/assessments"
import { errorResponse, parseJsonBody } from "@/server/http"
import { submitAssessmentRequestSchema } from "@/lib/contracts/assessment"

/**
 * Evaluates the saved answers on the server and records the final result.
 * If the app showed a different outcome, the server's wins and the mismatch
 * is logged without any answers or outcomes, which are health data.
 */
export const POST = withUser(async ({ request, params, user, db }) => {
  const body = await parseJsonBody(request, submitAssessmentRequestSchema)
  if (!body.ok) {
    return body.response
  }
  const id = params.id ?? ""
  const result = await submitAssessment(db, user, id)
  if (!result.ok) {
    return errorResponse(result.status, result.code, result.message)
  }
  if (body.data.clientOutcome !== undefined && body.data.clientOutcome !== result.value.outcome) {
    console.warn(`Assessment ${id}: the app's outcome differed from the server's. The server's result was recorded.`)
  }
  return Response.json(result.value)
})
