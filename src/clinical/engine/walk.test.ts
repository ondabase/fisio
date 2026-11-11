import type { Question } from "@/clinical/schema/bundle"

import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { setNext, unvalidatedBundleWith } from "@/clinical/testing/bundles"
import { answerProblem, matchingFlags, walk } from "@/clinical/engine/walk"

const regions = new Set(lbpBundle.regions.map(region => region.id))

function question(id: string): Question {
  const found = [
    ...lbpBundle.assessment.questions,
    ...lbpBundle.checkIn.questionnaire.questions,
  ].find(q => q.id === id)
  if (found === undefined) {
    throw new Error(`No question ${id}`)
  }
  return found
}

const multi: Question = {
  id: "aggravators",
  type: "multi",
  prompt: "What makes it worse?",
  options: [
    { id: "sitting", label: "Sitting" },
    { id: "bending", label: "Bending" },
  ],
  next: [
    { goto: "complete" },
  ],
}

describe("answerProblem", () => {
  it.each<[string, Question, unknown, boolean]>([
    [
      "single, an option",
      question("duration"),
      "over-12-weeks",
      true,
    ],
    [
      "single, not an option",
      question("duration"),
      "forever",
      false,
    ],
    [
      "single, not a string",
      question("duration"),
      3,
      false,
    ],
    [
      "multi, options",
      multi,
      ["sitting", "bending"],
      true,
    ],
    [
      "multi, unknown option",
      multi,
      ["running"],
      false,
    ],
    ["multi, empty", multi, [], false],
    [
      "multi, repeated",
      multi,
      ["sitting", "sitting"],
      false,
    ],
    [
      "multi, not a list",
      multi,
      "sitting",
      false,
    ],
    [
      "body-map, regions",
      question("pain-regions"),
      ["lower-back"],
      true,
    ],
    [
      "body-map, unknown region",
      question("pain-regions"),
      ["neck"],
      false,
    ],
    [
      "yes-no, boolean",
      question("fever"),
      false,
      true,
    ],
    [
      "yes-no, not a boolean",
      question("fever"),
      "no",
      false,
    ],
    [
      "scale, in range",
      question("pain-intensity"),
      10,
      true,
    ],
    [
      "scale, below range",
      question("pain-intensity"),
      -1,
      false,
    ],
    [
      "scale, above range",
      question("pain-intensity"),
      11,
      false,
    ],
    [
      "scale, not whole",
      question("pain-intensity"),
      4.5,
      false,
    ],
    [
      "scale, not a number",
      question("pain-intensity"),
      "4",
      false,
    ],
  ])("%s", (...[, q, value, fits]) => {
    // The walk passes raw client input, so test values of any type.
    const problem = answerProblem(q, value as never, regions)

    expect(problem === null).toBe(fits)
  })

  it("names the kind of IDs a list answer needs", () => {
    expect(answerProblem(multi, [], regions)).toMatch(/option IDs/)
    expect(answerProblem(question("pain-regions"), [], regions)).toMatch(/region IDs/)
  })
})

describe("walk", () => {
  const { assessment, safetyRules } = lbpBundle

  it("stops at the first unanswered question", () => {
    const result = walk(assessment, safetyRules, regions, {
      "pain-regions": ["lower-back"],
    })

    expect(result).toMatchObject({
      status: "pending",
      question: "saddle-numbness",
      known: {
        "pain-regions": ["lower-back"],
      },
    })
  })

  it("reports an answer that doesn't fit, without walking past it", () => {
    const result = walk(assessment, safetyRules, regions, {
      "pain-regions": ["neck"],
    })

    expect(result).toEqual({
      status: "invalid",
      question: "pain-regions",
      reason: expect.stringMatching(/region IDs/) as unknown,
    })
  })

  it("stops early on an urgent rule and traces why", () => {
    const result = walk(assessment, safetyRules, regions, {
      "pain-regions": ["lower-back"],
      "saddle-numbness": true,
    })

    expect(result.status).toBe("early-stop")
    expect(result.status === "early-stop" && result.trace.slice(-2)).toEqual([
      { kind: "safety", ruleId: "saddle-numbness", severity: "urgent" },
      {
        kind: "early-stop",
        ruleIds: ["saddle-numbness"],
      },
    ])
  })

  it("throws on an edge to a question that doesn't exist", () => {
    const bundle = unvalidatedBundleWith((content) => {
      setNext(content.assessment.questions, "pain-regions", [
        { goto: "nowhere" },
      ])
    })

    expect(() => walk(bundle.assessment, [], regions, {
      "pain-regions": ["lower-back"],
    })).toThrow("Unknown question \"nowhere\"")
  })

  it("throws when no edge matches", () => {
    const bundle = unvalidatedBundleWith((content) => {
      setNext(content.assessment.questions, "pain-regions", [
        {
          when: { op: "eq", question: "fever", value: true },
          goto: "complete",
        },
      ])
    })

    expect(() => walk(bundle.assessment, [], regions, {
      "pain-regions": ["lower-back"],
    })).toThrow("no matching edge")
  })

  it("throws on a loop instead of walking forever", () => {
    const bundle = unvalidatedBundleWith((content) => {
      setNext(content.assessment.questions, "pain-regions", [
        { goto: "pain-regions" },
      ])
    })

    expect(() => walk(bundle.assessment, [], regions, {
      "pain-regions": ["lower-back"],
    })).toThrow("didn't finish")
  })
})

describe("matchingFlags", () => {
  it("returns every rule that holds, in content order", () => {
    const flags = matchingFlags(lbpBundle.safetyRules, { "weight-loss": true, "cancer-history": true })

    expect(flags).toEqual([
      { ruleId: "cancer-history", severity: "refer" },
      { ruleId: "unexplained-weight-loss", severity: "refer" },
    ])
  })
})
