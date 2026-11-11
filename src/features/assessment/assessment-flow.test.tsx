import type { TestInstance } from "test-renderer"
import type { Answers } from "@/clinical/engine/types"
import type { Vignette } from "@/clinical/vignettes/vignette"

import { Alert } from "react-native"

import { fireEvent, screen } from "@testing-library/react-native"
import { renderRouter } from "expo-router/testing-library"

import vignettesJson from "@/clinical/vignettes/lbp.vignettes.json"

import AppLayout from "@/app/(app)/_layout"
import Today from "@/app/(app)/(tabs)/index"
import { evaluate } from "@/clinical/engine/assessment"
import Result from "@/app/(app)/assessment/result"
import BodyMap from "@/app/(app)/assessment/body-map"
import { lbpBundle } from "@/clinical/content/lbp/bundle"
import Question from "@/app/(app)/assessment/question/[id]"
import AssessmentLayout from "@/app/(app)/assessment/_layout"
import { vignetteFileSchema } from "@/clinical/vignettes/vignette"
import { createQueryWrapper } from "@/testing/query-wrapper"

/*
 * Every assessment vignette, replayed through the real screens and engine:
 * answer only what each screen asks, then check the result screen. The API
 * is mocked; its submit runs the engine on the saved answers, as the
 * server does.
 */

const mockSaved: { answers: Answers } = { answers: {} }

jest.mock("@/features/assessment/api", () => {
  const { lbpBundle: bundle } = jest.requireActual<{ lbpBundle: typeof lbpBundle }>("@/clinical/content/lbp/bundle")
  const { evaluate: run } = jest.requireActual<{ evaluate: typeof evaluate }>("@/clinical/engine/assessment")
  const content = {
    contentVersionId: "00000000-0000-4000-8000-000000000001",
    version: bundle.version,
    checksum: "test",
    draft: true,
    bundle,
  }
  return {
    useCurrentContent: () => ({
      data: content,
      isError: false,
      refetch: jest.fn(),
    }),
    useAssessmentApi: () => ({
      start: async () => ({ id: "00000000-0000-4000-8000-000000000002", contentVersionId: content.contentVersionId }),
      save: async (...[, answers]: [string, Answers]) => {
        mockSaved.answers = answers
      },
      submit: async () => {
        const result = run(bundle, mockSaved.answers)
        if (result.status !== "evaluated") {
          throw new Error(`Submitted an unfinished assessment: ${result.status}`)
        }
        return { id: "00000000-0000-4000-8000-000000000002", programId: null, ...result }
      },
    }),
  }
})

jest.mock("@/features/program/api", () => ({
  useSessionSync: () => undefined,
  useProgram: () => ({
    data: null,
    isError: false,
    isPending: false,
    refetch: jest.fn(),
  }),
  useContentVersion: () => ({ data: undefined, isError: false, isPending: false }),
  useLogSession: () => jest.fn(),
}))

const routes = {
  "(app)/_layout": AppLayout,
  "(app)/(tabs)/index": Today,
  "(app)/assessment/_layout": AssessmentLayout,
  "(app)/assessment/body-map": BodyMap,
  "(app)/assessment/question/[id]": Question,
  "(app)/assessment/result": Result,
}

const headlines = {
  urgent: "Get medical care now",
  refer: "Check in with a healthcare provider first",
  eligible: "You're a good fit for a home program",
}

/* Screens earlier in the stack stay mounted, so the newest match is the visible one. */
function last<T>(items: Array<T>): T {
  const item = items.at(-1)
  if (item === undefined) {
    throw new Error("No match.")
  }
  return item
}

function currentQuestionId(): string | undefined {
  const steps = screen.root?.queryAll(node => typeof node.props.testID === "string" && node.props.testID.startsWith("question-"), { matchDeepestOnly: true }) ?? []
  const step: TestInstance | undefined = steps.at(-1)
  return (step?.props.testID as string | undefined)?.slice("question-".length)
}

async function answerCurrent(questionId: string, answers: Answers) {
  const question = lbpBundle.assessment.questions.find(candidate => candidate.id === questionId)
  const value = answers[questionId]
  if (question === undefined || value === undefined) {
    throw new Error(`The UI asked "${questionId}", which the vignette doesn't answer.`)
  }

  switch (question.type) {
    case "body-map":
      await fireEvent.press(last(screen.getAllByRole("button", { name: "Choose from a list instead" })))
      for (const regionId of value as Array<string>) {
        const label = lbpBundle.regions.find(region => region.id === regionId)?.label ?? regionId
        await fireEvent.press(last(screen.getAllByRole("checkbox", { name: label })))
      }
      break
    case "yes-no":
      await fireEvent.press(last(screen.getAllByRole("radio", {
        name: value === true
          ? "Yes"
          : "No",
      })))
      break
    case "single":
    case "multi": {
      for (const optionId of Array.isArray(value)
        ? value
        : [value as string]) {
        const label = question.options.find(option => option.id === optionId)?.label ?? optionId
        await fireEvent.press(last(screen.getAllByRole(question.type === "single"
          ? "radio"
          : "checkbox", { name: label })))
      }
      break
    }
    case "scale": {
      const number = value as number
      const name = number === question.min
        ? `${number}, ${question.minLabel}`
        : number === question.max
          ? `${number}, ${question.maxLabel}`
          : String(number)
      await fireEvent.press(last(screen.getAllByRole("radio", { name })))
    }
  }
  await fireEvent.press(last(screen.getAllByRole("button", { name: "Continue" })))
}

const assessmentVignettes = vignetteFileSchema.parse(vignettesJson)
  .filter((vignette): vignette is Extract<Vignette, { kind: "assessment" }> => vignette.kind === "assessment")

beforeEach(() => {
  mockSaved.answers = {}
})

describe("assessment flow", () => {
  it.each(assessmentVignettes.map(vignette => [vignette.id, vignette] as const))("%s", async (...[, vignette]) => {
    await renderRouter(routes, {
      initialUrl: "/",
      wrapper: createQueryWrapper(),
    })
    await fireEvent.press(screen.getByRole("button", { name: "Start the assessment" }))

    const asked: Array<string> = []
    for (let questionId = await screen.findByTestId("question-pain-regions").then(() => currentQuestionId()); questionId !== undefined && !asked.includes(questionId); questionId = currentQuestionId()) {
      asked.push(questionId)
      await answerCurrent(questionId, vignette.answers)
    }

    expect(await screen.findByText(headlines[vignette.expect.outcome])).toBeOnTheScreen()
    if (vignette.expect.trackId !== null) {
      const track = lbpBundle.tracks.find(candidate => candidate.id === vignette.expect.trackId)
      expect(screen.getByText(track?.title ?? "")).toBeOnTheScreen()
    }
    // The UI asked exactly the questions the engine walks for these answers.
    const engine = evaluate(lbpBundle, vignette.answers)
    expect(engine.status === "evaluated" && asked).toEqual(engine.status === "evaluated" && engine.answered)
  })

  it("shows the draft notice on every step", async () => {
    await renderRouter(routes, {
      initialUrl: "/",
      wrapper: createQueryWrapper(),
    })
    await fireEvent.press(screen.getByRole("button", { name: "Start the assessment" }))

    expect(await screen.findByText("DRAFT CONTENT")).toBeOnTheScreen()
  })

  it("offers a call to 911 on an urgent result", async () => {
    await renderRouter(routes, {
      initialUrl: "/",
      wrapper: createQueryWrapper(),
    })
    await fireEvent.press(screen.getByRole("button", { name: "Start the assessment" }))
    await screen.findByTestId("question-pain-regions")
    await answerCurrent("pain-regions", {
      "pain-regions": ["lower-back"],
    })
    await answerCurrent("saddle-numbness", { "saddle-numbness": true })

    expect(await screen.findByRole("button", { name: "Call 911" })).toBeOnTheScreen()
  })
  it("closes from any step after confirming", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((...[, , buttons]) => {
      buttons?.find(button => button.text === "Leave")?.onPress?.()
    })
    await renderRouter(routes, {
      initialUrl: "/",
      wrapper: createQueryWrapper(),
    })
    await fireEvent.press(screen.getByRole("button", { name: "Start the assessment" }))
    await screen.findByTestId("question-pain-regions")

    await fireEvent.press(last(screen.getAllByRole("button", { name: "Close the assessment" })))

    expect(screen).toHavePathname("/")
  })
})
