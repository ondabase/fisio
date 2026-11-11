import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { evaluate, nextStep } from "@/clinical/engine/assessment"
import { bundleWith, unvalidatedBundleWith } from "@/clinical/testing/bundles"

const clear = {
  "pain-regions": ["lower-back"],
  "saddle-numbness": false,
  "bladder-bowel": false,
  "leg-weakness": false,
  "fever": false,
  "cancer-history": false,
  "weight-loss": false,
  "trauma": false,
  "night-pain": false,
  "duration": "under-6-weeks",
  "pain-intensity": 5,
  "daily-impact": 5,
}

describe("nextStep", () => {
  it("starts at the first question", () => {
    expect(nextStep(lbpBundle, {})).toEqual({ kind: "question", question: "pain-regions" })
  })

  it("branches to the leg question only when a leg region was marked", () => {
    // Everything up to pain intensity, with a leg region marked.
    const upToIntensity = Object.fromEntries(Object.entries({
      ...clear,
      "pain-regions": ["below-knee-left"],
    })
      .filter(([question]) => question !== "daily-impact"))

    expect(nextStep(lbpBundle, upToIntensity)).toEqual({ kind: "question", question: "leg-symptoms" })
  })

  it("reports an invalid answer", () => {
    expect(nextStep(lbpBundle, { "pain-regions": "lower-back" })).toMatchObject({ kind: "invalid", question: "pain-regions" })
  })

  it("stops early on an urgent red flag", () => {
    expect(nextStep(lbpBundle, {
      "pain-regions": ["lower-back"],
      "saddle-numbness": true,
    })).toEqual({
      kind: "early-stop",
      flags: [
        { ruleId: "saddle-numbness", severity: "urgent" },
      ],
    })
  })

  it("completes when every asked question is answered", () => {
    expect(nextStep(lbpBundle, clear)).toEqual({ kind: "complete" })
  })
})

describe("evaluate", () => {
  it("is incomplete until every asked question is answered", () => {
    expect(evaluate(lbpBundle, {
      "pain-regions": ["lower-back"],
    })).toEqual({ status: "incomplete", question: "saddle-numbness" })
  })

  it("passes an invalid answer through", () => {
    expect(evaluate(lbpBundle, { ...clear, "pain-intensity": 12 })).toMatchObject({ status: "invalid", question: "pain-intensity" })
  })

  it("selects a track and traces every step for an eligible user", () => {
    const result = evaluate(lbpBundle, clear)

    expect(result).toMatchObject({
      status: "evaluated",
      outcome: "eligible",
      flags: [],
      trackId: "general",
      startPhase: "calm",
    })
    expect(result.status === "evaluated" && result.answered).toEqual(Object.keys(clear))
    expect(result.status === "evaluated" && result.trace.at(-1)).toEqual({
      kind: "track",
      rule: 2,
      track: "general",
      phase: "calm",
    })
  })

  it("is urgent with no track after an early stop", () => {
    const result = evaluate(lbpBundle, {
      "pain-regions": ["lower-back"],
      "saddle-numbness": true,
    })

    expect(result).toMatchObject({
      status: "evaluated",
      outcome: "urgent",
      trackId: null,
      startPhase: null,
      answered: ["pain-regions", "saddle-numbness"],
    })
  })

  it("refers with no track when a refer flag holds", () => {
    const result = evaluate(lbpBundle, { ...clear, fever: true })

    expect(result).toMatchObject({
      status: "evaluated",
      outcome: "refer",
      flags: [
        { ruleId: "possible-infection", severity: "refer" },
      ],
      trackId: null,
    })
    expect(result.status === "evaluated" && result.trace).toContainEqual({ kind: "safety", ruleId: "possible-infection", severity: "refer" })
  })

  it("is urgent when an urgent rule that doesn't stop early holds", () => {
    const bundle = bundleWith((content) => {
      content.safetyRules.push({
        id: "severe-pain-and-fever",
        severity: "urgent",
        earlyStop: false,
        when: {
          op: "all",
          of: [
            { op: "eq", question: "fever", value: true },
            { op: "gte", question: "pain-intensity", value: 9 },
          ],
        },
        summary: "Test rule.",
      })
    })

    const result = evaluate(bundle, { ...clear, "fever": true, "pain-intensity": 10 })

    expect(result).toMatchObject({ status: "evaluated", outcome: "urgent", trackId: null })
    expect(result.status === "evaluated" && result.flags.map(flag => flag.ruleId)).toEqual(["possible-infection", "severe-pain-and-fever"])
  })

  it("throws when no track rule matches", () => {
    const bundle = unvalidatedBundleWith((content) => {
      content.trackRules = [
        {
          when: { op: "eq", question: "fever", value: true },
          track: "general",
          phase: "calm",
        },
      ]
    })

    expect(() => evaluate(bundle, clear)).toThrow("No track rule matched")
  })
})
