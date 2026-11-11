import type { Predicate } from "@/clinical/schema/predicate"

import { holds } from "@/clinical/engine/predicate"

const answers = {
  choice: "b",
  flag: true,
  pain: 6,
  regions: ["lower-back", "buttock-left"],
}

describe("holds", () => {
  it.each<[string, Predicate, boolean]>([
    [
      "eq option",
      { op: "eq", question: "choice", value: "b" },
      true,
    ],
    [
      "eq other option",
      { op: "eq", question: "choice", value: "a" },
      false,
    ],
    [
      "eq boolean",
      { op: "eq", question: "flag", value: true },
      true,
    ],
    [
      "eq number",
      { op: "eq", question: "pain", value: 6 },
      true,
    ],
    [
      "in",
      {
        op: "in",
        question: "choice",
        values: ["a", "b"],
      },
      true,
    ],
    [
      "in, not listed",
      {
        op: "in",
        question: "choice",
        values: ["a"],
      },
      false,
    ],
    [
      "in, not a string answer",
      {
        op: "in",
        question: "pain",
        values: ["6"],
      },
      false,
    ],
    [
      "includes",
      {
        op: "includes",
        question: "regions",
        anyOf: ["buttock-left", "thigh"],
      },
      true,
    ],
    [
      "includes, none",
      {
        op: "includes",
        question: "regions",
        anyOf: ["thigh"],
      },
      false,
    ],
    [
      "includes, not a list answer",
      {
        op: "includes",
        question: "choice",
        anyOf: ["b"],
      },
      false,
    ],
    [
      "gte, equal",
      { op: "gte", question: "pain", value: 6 },
      true,
    ],
    [
      "gte, below",
      { op: "gte", question: "pain", value: 7 },
      false,
    ],
    [
      "gte, not a number answer",
      { op: "gte", question: "choice", value: 0 },
      false,
    ],
    [
      "lte, equal",
      { op: "lte", question: "pain", value: 6 },
      true,
    ],
    [
      "lte, above",
      { op: "lte", question: "pain", value: 5 },
      false,
    ],
    [
      "lte, not a number answer",
      { op: "lte", question: "flag", value: 10 },
      false,
    ],
    [
      "all, every child holds",
      {
        op: "all",
        of: [
          { op: "eq", question: "flag", value: true },
          { op: "gte", question: "pain", value: 1 },
        ],
      },
      true,
    ],
    [
      "all, one child fails",
      {
        op: "all",
        of: [
          { op: "eq", question: "flag", value: true },
          { op: "gte", question: "pain", value: 9 },
        ],
      },
      false,
    ],
    [
      "any, one child holds",
      {
        op: "any",
        of: [
          { op: "eq", question: "flag", value: false },
          { op: "gte", question: "pain", value: 1 },
        ],
      },
      true,
    ],
    [
      "any, no child holds",
      {
        op: "any",
        of: [
          { op: "eq", question: "flag", value: false },
        ],
      },
      false,
    ],
    [
      "not",
      {
        op: "not",
        of: { op: "eq", question: "flag", value: false },
      },
      true,
    ],
  ])("%s", (...[, predicate, expected]) => {
    expect(holds(predicate, answers)).toBe(expected)
  })

  it("treats every leaf about an unanswered question as false", () => {
    const leaves: Array<Predicate> = [
      { op: "eq", question: "missing", value: true },
      {
        op: "in",
        question: "missing",
        values: ["a"],
      },
      {
        op: "includes",
        question: "missing",
        anyOf: ["a"],
      },
      { op: "gte", question: "missing", value: 0 },
      { op: "lte", question: "missing", value: 10 },
    ]

    expect(leaves.map(leaf => holds(leaf, answers))).toEqual([false, false, false, false, false])
  })
})
