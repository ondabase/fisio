import type { Answers } from "@/clinical/engine/types"
import type { AssessmentResult, CurrentContent } from "@/lib/contracts/assessment"

import { z } from "zod"

import { useAuth } from "@clerk/expo"
import { useQuery } from "@tanstack/react-query"

import { useApi } from "@/lib/api"
import { assessmentResultSchema, createdAssessmentSchema, currentContentSchema } from "@/lib/contracts/assessment"

/* Data access for the assessment flow. */

/** The content version to run. Long-lived: a version never changes once published. */
function useCurrentContent() {
  const { userId } = useAuth()
  const api = useApi()

  return useQuery({
    queryKey: ["content", "lbp", userId],
    queryFn: async () => api({ path: "/api/content/current?content=lbp", schema: currentContentSchema }),
    staleTime: 5 * 60_000,
  })
}

/* Saving answers returns no body. */
const noContent = z.unknown()

/** Assessment requests, bound to the signed-in user's session. */
function useAssessmentApi() {
  const api = useApi()

  return {
    start: async (content: CurrentContent) => api({
      path: "/api/assessments",
      method: "POST",
      body: { contentVersionId: content.contentVersionId },
      schema: createdAssessmentSchema,
    }),
    save: async (id: string, answers: Answers) => api({
      path: `/api/assessments/${id}/answers`,
      method: "PUT",
      body: { answers },
      schema: noContent,
    }),
    submit: async (id: string, clientOutcome: AssessmentResult["outcome"]): Promise<AssessmentResult> => api({
      path: `/api/assessments/${id}/submit`,
      method: "POST",
      body: { clientOutcome },
      schema: assessmentResultSchema,
    }),
  }
}

export {
  useAssessmentApi,
  useCurrentContent,
}
