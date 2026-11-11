import type { Predicate } from "@/clinical/schema/predicate"

import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { canonicalJson } from "@/clinical/publish/canonical-json"
import { describePredicate, reviewDoc } from "@/clinical/publish/review-doc"

describe("canonicalJson", () => {
  it("gives the same text whatever the key order", () => {
    expect(canonicalJson({
      b: 1,
      a: {
        d: [
          { y: 1, x: 2 },
        ],
        c: null,
      },
    })).toBe(canonicalJson({
      a: {
        c: null,
        d: [
          { x: 2, y: 1 },
        ],
      },
      b: 1,
    }))
  })

  it("keeps array order, which is meaningful in content", () => {
    expect(canonicalJson([2, 1])).not.toBe(canonicalJson([1, 2]))
  })
})

describe("describePredicate", () => {
  it.each<[Predicate, string]>([
    [
      { op: "eq", question: "fever", value: true },
      "`fever` is yes",
    ],
    [
      { op: "eq", question: "fever", value: false },
      "`fever` is no",
    ],
    [
      { op: "eq", question: "duration", value: "over-12-weeks" },
      "`duration` is over-12-weeks",
    ],
    [
      {
        op: "in",
        question: "leg",
        values: ["a", "b"],
      },
      "`leg` is one of a, b",
    ],
    [
      {
        op: "includes",
        question: "regions",
        anyOf: ["x"],
      },
      "`regions` includes any of x",
    ],
    [
      { op: "gte", question: "pain", value: 7 },
      "`pain` is at least 7",
    ],
    [
      { op: "lte", question: "pain", value: 3 },
      "`pain` is at most 3",
    ],
    [
      {
        op: "not",
        of: { op: "eq", question: "fever", value: true },
      },
      "not (`fever` is yes)",
    ],
    [
      {
        op: "all",
        of: [
          { op: "gte", question: "pain", value: 7 },
        ],
      },
      "`pain` is at least 7",
    ],
    [
      {
        op: "any",
        of: [
          { op: "gte", question: "pain", value: 7 },
        ],
      },
      "`pain` is at least 7",
    ],
    [
      {
        op: "all",
        of: [
          { op: "gte", question: "a", value: 1 },
          { op: "gte", question: "b", value: 2 },
        ],
      },
      "all of (`a` is at least 1; `b` is at least 2)",
    ],
    [
      {
        op: "any",
        of: [
          { op: "gte", question: "a", value: 1 },
          { op: "gte", question: "b", value: 2 },
        ],
      },
      "any of (`a` is at least 1; `b` is at least 2)",
    ],
  ])("%j", (predicate, text) => {
    expect(describePredicate(predicate)).toBe(text)
  })
})

describe("reviewDoc", () => {
  const doc = reviewDoc({
    bundle: lbpBundle,
    checksum: "abc123",
    vignettes: [
      {
        id: "passes",
        description: "A passing vignette.",
        passed: true,
        failures: [],
      },
      {
        id: "fails",
        description: "A failing vignette.",
        passed: false,
        failures: ["outcome: expected \"refer\", got \"eligible\""],
      },
    ],
    generatedAt: "2026-11-11",
  })

  it("identifies the exact version and checksum being signed", () => {
    expect(doc).toContain("# Lower back pain content 0.1.0-draft.1: clinical review")
    expect(doc).toContain("Checksum (SHA-256): `abc123`")
    expect(doc).toContain("## Sign-off")
  })

  it("marks a draft as not clinically approved", () => {
    expect(doc).toContain("**DRAFT. Not clinically approved.**")
  })

  it("covers every question, safety rule, exercise, and track", () => {
    const ids = [
      ...lbpBundle.assessment.questions.map(question => question.id),
      ...lbpBundle.checkIn.questionnaire.questions.map(question => question.id),
      ...lbpBundle.safetyRules.map(rule => rule.id),
      ...lbpBundle.checkIn.safetyRules.map(rule => rule.id),
      ...lbpBundle.exercises.map(exercise => exercise.id),
      ...lbpBundle.tracks.map(track => track.id),
    ]

    expect(ids.filter(id => !doc.includes(`\`${id}\``))).toEqual([])
  })

  it("states the engine's safety invariants", () => {
    expect(doc).toContain("A user who is worse never progresses")
  })

  it("lists vignette results, with failures spelled out", () => {
    expect(doc).toContain("| `passes` | pass |")
    expect(doc).toContain("| `fails` | **fail**: outcome: expected \"refer\", got \"eligible\" |")
    expect(doc).toContain("Vignettes: 1 of 2 passed")
  })

  it("omits the draft warning for a release version", () => {
    const release = reviewDoc({
      bundle: { ...lbpBundle, version: "1.0.0" },
      checksum: "abc",
      vignettes: [],
      generatedAt: "2026-11-11",
    })

    expect(release).not.toContain("DRAFT")
  })
})
