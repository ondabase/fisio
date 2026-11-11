import type { Vignette } from "@/clinical/vignettes/vignette"

import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { runVignettes } from "@/clinical/vignettes/vignette"

/* The runner must report a wrong expectation, or the golden tests prove nothing. */

const assessment: Vignette = {
  id: "wrong-track",
  kind: "assessment",
  description: "Expects the wrong track.",
  answers: {
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
  },
  expect: {
    outcome: "eligible",
    flags: [],
    trackId: "leg-symptoms",
    startPhase: "calm",
    earlyStop: false,
  },
}

const checkIn: Vignette = {
  id: "wrong-decision",
  kind: "check-in",
  description: "Expects the wrong decision.",
  program: { trackId: "general", phaseId: "calm" },
  answers: {
    "checkin-saddle-numbness": false,
    "checkin-bladder-bowel": false,
    "checkin-leg-weakness": false,
    "checkin-new-symptoms": false,
    "checkin-change": "same",
    "checkin-pain": 4,
    "checkin-adherence": "most",
  },
  expect: { decision: "progress", toPhase: "build", flags: [] },
}

describe("runVignettes", () => {
  it("reports each field that differs", () => {
    const [assessmentResult, checkInResult] = runVignettes(lbpBundle, [assessment, checkIn])

    expect(assessmentResult).toMatchObject({
      passed: false,
      failures: ["trackId: expected \"leg-symptoms\", got \"general\""],
    })
    expect(checkInResult?.failures).toEqual([
      "decision: expected \"progress\", got \"hold\"",
      "toPhase: expected \"build\", got \"calm\"",
    ])
  })

  it("fails a vignette whose answers don't finish", () => {
    const [assessmentResult, checkInResult] = runVignettes(lbpBundle, [
      {
        ...assessment,
        answers: {
          "pain-regions": ["lower-back"],
        },
      },
      { ...checkIn, answers: {} },
    ])

    expect(assessmentResult?.failures).toEqual(["assessment didn't finish: incomplete at \"saddle-numbness\""])
    expect(checkInResult?.failures).toEqual(["check-in didn't finish: incomplete at \"checkin-saddle-numbness\""])
  })
})
