import type { ReactNode } from "react"
import type { Bundle } from "@/clinical/schema/bundle"
import type { CurrentContent } from "@/lib/contracts/assessment"
import type { Result } from "@/features/assessment/use-assessment"
import type { Answers, AnswerValue } from "@/clinical/engine/types"

import { router } from "expo-router"
import { Alert } from "react-native"
import { useRef, useState } from "react"

import { evaluate, nextStep } from "@/clinical/engine/assessment"
import { useAssessmentApi } from "@/features/assessment/api"
import { AssessmentContext } from "@/features/assessment/use-assessment"

/*
 * State for one assessment, shared by its screens. The app runs the engine
 * itself so each step is instant, and saves the answers as it goes. At the
 * end the server evaluates the saved answers, and its result is the one
 * shown, with one exception: an urgent stop shows the emergency screen at
 * once, without waiting for the network.
 */

/** The route that shows a question. */
function routeFor(bundle: Bundle, questionId: string) {
  const question = bundle.assessment.questions.find(candidate => candidate.id === questionId)
  return question?.type === "body-map"
    ? "/assessment/body-map" as const
    : {
        pathname: "/assessment/question/[id]" as const,
        params: { id: questionId },
      }
}

const SUBMIT_ATTEMPTS = 3

type AssessmentProviderProps = {
  content: CurrentContent
  assessmentId: string
  children: ReactNode
}

function AssessmentProvider({ content, assessmentId, children }: AssessmentProviderProps) {
  const api = useAssessmentApi()
  const { bundle } = content
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<Result | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // Saves run in order, so the server never ends up with an older answer set.
  const lastSaveRef = useRef<Promise<unknown>>(Promise.resolve())

  async function save(next: Answers) {
    const saving = lastSaveRef.current.catch(() => undefined).then(async () => api.save(assessmentId, next))
    lastSaveRef.current = saving
    return saving
  }

  async function submit(clientOutcome: Result["outcome"]) {
    let lastError: unknown
    for (let attempt = 0; attempt < SUBMIT_ATTEMPTS; attempt++) {
      try {
        await lastSaveRef.current
        return await api.submit(assessmentId, clientOutcome)
      }
      catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  function answer(questionId: string, value: AnswerValue) {
    const next = { ...answers, [questionId]: value }
    setAnswers(next)
    void save(next).catch(() => undefined)

    const step = nextStep(bundle, next)
    switch (step.kind) {
      case "question":
        router.push(routeFor(bundle, step.question))
        return
      case "invalid":
        Alert.alert("Check your answer", step.reason)
        return
      case "early-stop": {
        // Safety first: show the emergency screen now; record it in the background.
        setResult({
          outcome: "urgent",
          flags: step.flags,
          trackId: null,
          startPhase: null,
          source: "app",
        })
        router.replace("/assessment/result")
        void submit("urgent")
          .then(server => setResult({ ...server, source: "server" }))
          .catch(() => undefined)
        return
      }
      case "complete": {
        const local = evaluate(bundle, next)
        const clientOutcome = local.status === "evaluated"
          ? local.outcome
          : "eligible"
        setSubmitting(true)
        submit(clientOutcome)
          .then((server) => {
            setResult({ ...server, source: "server" })
            router.replace("/assessment/result")
          })
          .catch(() => {
            Alert.alert("Couldn't get your result", "Check your connection, then tap Continue to try again.")
          })
          .finally(() => setSubmitting(false))
      }
    }
  }

  return (
    <AssessmentContext value={{
      bundle,
      draft: content.draft,
      answers,
      result,
      submitting,
      answer,
    }}
    >
      {children}
    </AssessmentContext>
  )
}

export { AssessmentProvider }
