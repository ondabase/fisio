import { withUser } from "@/server/auth"
import { startAssessment } from "@/server/assessments"
import { errorResponse, parseJsonBody } from "@/server/http"
import { createAssessmentRequestSchema } from "@/lib/contracts/assessment"

/** Starts an assessment on the content version the app fetched. */
export const POST = withUser(async ({ request, user, db }) => {
  const body = await parseJsonBody(request, createAssessmentRequestSchema)
  if (!body.ok) {
    return body.response
  }
  const result = await startAssessment(db, user, body.data.contentVersionId)
  if (!result.ok) {
    return errorResponse(result.status, result.code, result.message)
  }
  return Response.json({ id: result.value.id, contentVersionId: result.value.contentVersionId }, { status: 201 })
})
