import type { BundleInput } from "@/clinical/schema/bundle"

import { issuesFor, setNext } from "@/clinical/testing/bundles"

type Edit = (content: BundleInput) => void

function question(content: BundleInput, id: string) {
  const found = content.assessment.questions.find(candidate => candidate.id === id)
  if (found === undefined) {
    throw new Error(`No question ${id}`)
  }
  return found
}

function firstTrack(content: BundleInput) {
  const track = content.tracks[0]
  if (track === undefined) {
    throw new Error("No track")
  }
  return track
}

function pushRule(content: BundleInput, when: BundleInput["safetyRules"][number]["when"]) {
  content.safetyRules.push({
    id: "test-rule",
    severity: "refer",
    earlyStop: false,
    when,
    summary: "Test.",
  })
}

describe("bundle integrity", () => {
  it("accepts the draft LBP content", () => {
    expect(issuesFor(() => undefined)).toEqual([])
  })

  it.each<[string, Edit, string]>([
    [
      "a duplicate region",
      (c) => {
        c.regions.push({ id: "lower-back", label: "Again" })
      },
      "regions: duplicate ID \"lower-back\"",
    ],
    [
      "a duplicate question",
      (c) => {
        c.assessment.questions.push({
          ...question(c, "fever"),
        })
      },
      "assessment questions: duplicate ID \"fever\"",
    ],
    [
      "a missing start question",
      (c) => {
        c.assessment.start = "nowhere"
      },
      "start question \"nowhere\" doesn't exist",
    ],
    [
      "a conditional last edge",
      (c) => {
        setNext(c.assessment.questions, "daily-impact", [
          {
            when: { op: "gte", question: "daily-impact", value: 5 },
            goto: "complete",
          },
        ])
      },
      "the last edge must have no \"when\"",
    ],
    [
      "an unconditional edge before the last",
      (c) => {
        setNext(c.assessment.questions, "daily-impact", [
          { goto: "complete" },
          { goto: "complete" },
        ])
      },
      "edge 1 has no \"when\"",
    ],
    [
      "an edge to an unknown question",
      (c) => {
        setNext(c.assessment.questions, "daily-impact", [
          { goto: "nowhere" },
        ])
      },
      "goes to unknown question \"nowhere\"",
    ],
    [
      "a scale with min not below max",
      (c) => {
        const scale = question(c, "pain-intensity")
        if (scale.type === "scale") {
          scale.min = 10
        }
      },
      "min must be less than max",
    ],
    [
      "a loop",
      (c) => {
        setNext(c.assessment.questions, "daily-impact", [
          { goto: "pain-regions" },
        ])
      },
      "loop back on themselves",
    ],
    [
      "an unreachable question",
      (c) => {
        setNext(c.assessment.questions, "night-pain", [
          { goto: "pain-intensity" },
        ])
      },
      "question \"duration\" can't be reached",
    ],
    [
      "a refer rule that stops early",
      (c) => {
        const rule = c.safetyRules.find(candidate => candidate.id === "possible-infection")
        if (rule !== undefined) {
          rule.earlyStop = true
        }
      },
      "only urgent rules can stop early",
    ],
    [
      "a rule about an unknown question",
      c => pushRule(c, { op: "eq", question: "nowhere", value: true }),
      "unknown question \"nowhere\"",
    ],
    [
      "eq with the wrong type",
      c => pushRule(c, { op: "eq", question: "fever", value: "yes" }),
      "\"eq\" value doesn't fit yes-no question \"fever\"",
    ],
    [
      "eq with an unknown option",
      c => pushRule(c, { op: "eq", question: "duration", value: "forever" }),
      "\"eq\" value doesn't fit single question",
    ],
    [
      "eq outside a scale",
      c => pushRule(c, { op: "eq", question: "pain-intensity", value: 11 }),
      "\"eq\" value doesn't fit scale question",
    ],
    [
      "in on a yes-no question",
      c => pushRule(c, {
        op: "in",
        question: "fever",
        values: ["a"],
      }),
      "\"in\" needs a single-choice question",
    ],
    [
      "in with an unknown option",
      c => pushRule(c, {
        op: "in",
        question: "duration",
        values: ["forever"],
      }),
      "\"forever\" isn't an option of \"duration\"",
    ],
    [
      "includes on a single question",
      c => pushRule(c, {
        op: "includes",
        question: "duration",
        anyOf: ["a"],
      }),
      "\"includes\" needs a multi-choice or body-map question",
    ],
    [
      "includes with an unknown region",
      c => pushRule(c, {
        op: "includes",
        question: "pain-regions",
        anyOf: ["neck"],
      }),
      "\"neck\" isn't an option or region",
    ],
    [
      "gte on a yes-no question",
      c => pushRule(c, { op: "gte", question: "fever", value: 1 }),
      "\"gte\" needs a scale question",
    ],
    [
      "an error nested in all, any, and not",
      c => pushRule(c, {
        op: "all",
        of: [
          {
            op: "any",
            of: [
              {
                op: "not",
                of: { op: "eq", question: "nowhere", value: true },
              },
            ],
          },
        ],
      }),
      "unknown question \"nowhere\"",
    ],
    [
      "a duplicate safety rule across assessment and check-in",
      (c) => {
        c.checkIn.safetyRules.push({
          id: "saddle-numbness",
          severity: "urgent",
          earlyStop: true,
          when: { op: "eq", question: "checkin-saddle-numbness", value: true },
          summary: "Again.",
        })
      },
      "safety rules: duplicate ID \"saddle-numbness\"",
    ],
    [
      "a dose of an unknown exercise",
      (c) => {
        firstTrack(c).phases[0]?.sessions[0]?.doses.push({ exercise: "handstand", sets: 1, reps: 1 })
      },
      "unknown exercise \"handstand\"",
    ],
    [
      "a duplicate phase",
      (c) => {
        const track = firstTrack(c)
        track.phases.push(...JSON.parse(JSON.stringify(track.phases.slice(0, 1))) as typeof track.phases)
      },
      "phases: duplicate ID \"calm\"",
    ],
    [
      "a conditional last track rule",
      (c) => {
        c.trackRules = [
          {
            when: { op: "eq", question: "fever", value: false },
            track: "general",
            phase: "calm",
          },
        ]
      },
      "the last track rule must have no \"when\"",
    ],
    [
      "an unconditional track rule before the last",
      (c) => {
        c.trackRules = [
          { track: "general", phase: "calm" },
          { track: "general", phase: "build" },
        ]
      },
      "track rule 1: has no \"when\"",
    ],
    [
      "a track rule to an unknown track",
      (c) => {
        c.trackRules = [
          { track: "neck", phase: "calm" },
        ]
      },
      "unknown track \"neck\"",
    ],
    [
      "a track rule to an unknown phase",
      (c) => {
        c.trackRules = [
          { track: "general", phase: "advanced" },
        ]
      },
      "track \"general\" has no phase \"advanced\"",
    ],
    [
      "a track rule about a check-in question",
      (c) => {
        c.trackRules = [
          {
            when: { op: "eq", question: "checkin-change", value: "better" },
            track: "general",
            phase: "calm",
          },
          { track: "general", phase: "calm" },
        ]
      },
      "track rule 1: unknown question \"checkin-change\"",
    ],
    [
      "a worsening rule about an assessment question",
      (c) => {
        c.checkIn.worsening = { op: "gte", question: "pain-intensity", value: 8 }
      },
      "check-in worsening: unknown question \"pain-intensity\"",
    ],
    [
      "a conditional last check-in rule",
      (c) => {
        c.checkIn.rules = [
          {
            id: "only",
            when: { op: "eq", question: "checkin-change", value: "worse" },
            decision: "regress",
          },
        ]
      },
      "the last check-in rule must have no \"when\"",
    ],
    [
      "an unconditional check-in rule before the last",
      (c) => {
        c.checkIn.rules = [
          { id: "first", decision: "hold" },
          { id: "second", decision: "hold" },
        ]
      },
      "check-in rule \"first\": has no \"when\"",
    ],
    [
      "a check-in loop",
      (c) => {
        setNext(c.checkIn.questionnaire.questions, "checkin-adherence", [
          { goto: "checkin-saddle-numbness" },
        ])
      },
      "check-in: the questions loop back on themselves",
    ],
  ])("rejects %s", (...[, edit, message]) => {
    expect(issuesFor(edit).join("\n")).toContain(message)
  })
})
