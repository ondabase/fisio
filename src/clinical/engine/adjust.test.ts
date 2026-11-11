import { adjust } from "@/clinical/engine/adjust"
import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { bundleWith, unvalidatedBundleWith } from "@/clinical/testing/bundles"

const steady = {
  "checkin-saddle-numbness": false,
  "checkin-bladder-bowel": false,
  "checkin-leg-weakness": false,
  "checkin-new-symptoms": false,
  "checkin-change": "same",
  "checkin-pain": 4,
  "checkin-adherence": "most",
}

const calm = { trackId: "general", phaseId: "calm" }
const build = { trackId: "general", phaseId: "build" }
const strengthen = { trackId: "general", phaseId: "strengthen" }

/* The draft content with one check-in rule that always proposes `decision`. */
function alwaysProposing(decision: "progress" | "hold" | "regress") {
  return bundleWith((content) => {
    content.checkIn.rules = [
      { id: `always-${decision}`, decision },
    ]
  })
}

describe("adjust", () => {
  it("throws for a track the bundle doesn't have", () => {
    expect(() => adjust(lbpBundle, { trackId: "neck", phaseId: "calm" }, steady)).toThrow("isn't in bundle")
  })

  it("throws for a phase the track doesn't have", () => {
    expect(() => adjust(lbpBundle, { trackId: "general", phaseId: "advanced" }, steady)).toThrow("isn't in bundle")
  })

  it("is incomplete until every asked question is answered", () => {
    expect(adjust(lbpBundle, calm, { "checkin-saddle-numbness": false })).toEqual({ status: "incomplete", question: "checkin-bladder-bowel" })
  })

  it("passes an invalid answer through", () => {
    expect(adjust(lbpBundle, calm, { ...steady, "checkin-pain": "high" })).toMatchObject({ status: "invalid", question: "checkin-pain" })
  })

  it("stops the program on an urgent re-screen flag, with no content rule", () => {
    const result = adjust(lbpBundle, build, { "checkin-saddle-numbness": true })

    expect(result).toMatchObject({
      status: "adjusted",
      decision: "stop",
      ruleId: null,
      fromPhase: "build",
      toPhase: "build",
    })
    expect(result.status === "adjusted" && result.trace.at(-1)).toEqual({
      kind: "override",
      reason: "safety-flag-stops-program",
      from: "hold",
      to: "stop",
    })
  })

  it("stops the program on a refer flag found at the end", () => {
    const result = adjust(lbpBundle, build, { ...steady, "checkin-new-symptoms": true, "checkin-change": "better" })

    expect(result).toMatchObject({
      decision: "stop",
      flags: [
        { ruleId: "checkin-new-symptoms", severity: "refer" },
      ],
    })
    expect(result.status === "adjusted" && result.trace).toContainEqual({ kind: "safety", ruleId: "checkin-new-symptoms", severity: "refer" })
  })

  it("progresses to the next phase", () => {
    expect(adjust(alwaysProposing("progress"), calm, steady)).toMatchObject({ decision: "progress", ruleId: "always-progress", toPhase: "build" })
  })

  it("never progresses a worse user, whatever the content says", () => {
    const result = adjust(alwaysProposing("progress"), calm, { ...steady, "checkin-change": "worse" })

    expect(result).toMatchObject({ decision: "hold", ruleId: "always-progress", toPhase: "calm" })
    expect(result.status === "adjusted" && result.trace).toContainEqual({
      kind: "override",
      reason: "worsening-blocks-progress",
      from: "progress",
      to: "hold",
    })
  })

  it("holds instead of progressing past the final phase", () => {
    const result = adjust(alwaysProposing("progress"), strengthen, steady)

    expect(result).toMatchObject({ decision: "hold", toPhase: "strengthen" })
    expect(result.status === "adjusted" && result.trace).toContainEqual({
      kind: "override",
      reason: "already-final-phase",
      from: "progress",
      to: "hold",
    })
  })

  it("regresses to the previous phase", () => {
    expect(adjust(alwaysProposing("regress"), strengthen, steady)).toMatchObject({ decision: "regress", toPhase: "build" })
  })

  it("holds instead of regressing past the first phase", () => {
    const result = adjust(alwaysProposing("regress"), calm, steady)

    expect(result).toMatchObject({ decision: "hold", toPhase: "calm" })
    expect(result.status === "adjusted" && result.trace).toContainEqual({
      kind: "override",
      reason: "already-first-phase",
      from: "regress",
      to: "hold",
    })
  })

  it("holds", () => {
    expect(adjust(alwaysProposing("hold"), build, steady)).toMatchObject({ decision: "hold", toPhase: "build", flags: [] })
  })

  it("throws when no check-in rule matches", () => {
    const bundle = unvalidatedBundleWith((content) => {
      content.checkIn.rules = [
        {
          id: "never",
          when: { op: "eq", question: "checkin-change", value: "better" },
          decision: "progress",
        },
      ]
    })

    expect(() => adjust(bundle, calm, steady)).toThrow("No check-in rule matched")
  })
})
