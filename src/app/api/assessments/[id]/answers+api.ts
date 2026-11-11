import { withUser } from "@/server/auth"
import { saveAnswers } from "@/server/assessments"
import { errorResponse, parseJsonBody } from "@/server/http"
import { saveAnswersRequestSchema } from "@/lib/contracts/assessment"

/** Replaces the assessment's saved answers with the full set so far. */
export const PUT = withUser(async ({ request, params, user, db }) => {
  const body = await parseJsonBody(request, saveAnswersRequestSchema)
  if (!body.ok) {
    return body.response
  }
  const result = await saveAnswers(db, user, params.id ?? "", body.data.answers)
  if (!result.ok) {
    return errorResponse(result.status, result.code, result.message)
  }
  return new Response(null, { status: 204 })
})
