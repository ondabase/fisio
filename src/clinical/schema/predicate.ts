import { z } from "zod"

/*
 * The rule language of clinical content: a small JSON tree the PT can read
 * and the engine interprets. No code is ever evaluated.
 *
 * Every leaf names a question and checks its answer:
 * - eq:       the answer equals a value (option ID, yes/no boolean, or scale number)
 * - in:       a single-choice answer is one of the option IDs
 * - includes: a multi-choice or body-map answer contains any of the IDs
 * - gte, lte: a scale answer is at least / at most a number
 * Combine leaves with all (and), any (or), and not.
 *
 * A leaf about a question that wasn't asked (or isn't answered yet) is
 * false, so `not` of it is true. Content should prefer positive checks.
 */

type Predicate
  = | { op: "all", of: Array<Predicate> }
    | { op: "any", of: Array<Predicate> }
    | { op: "not", of: Predicate }
    | { op: "eq", question: string, value: string | number | boolean }
    | { op: "in", question: string, values: Array<string> }
    | { op: "includes", question: string, anyOf: Array<string> }
    | { op: "gte", question: string, value: number }
    | { op: "lte", question: string, value: number }

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "IDs are lowercase kebab-case")

const predicateSchema: z.ZodType<Predicate> = z.lazy(() => z.discriminatedUnion("op", [
  z.object({
    op: z.literal("all"),
    of: z.array(predicateSchema).min(1),
  }),
  z.object({
    op: z.literal("any"),
    of: z.array(predicateSchema).min(1),
  }),
  z.object({
    op: z.literal("not"),
    of: predicateSchema,
  }),
  z.object({
    op: z.literal("eq"),
    question: id,
    value: z.union([
      z.string(),
      z.number(),
      z.boolean(),
    ]),
  }),
  z.object({
    op: z.literal("in"),
    question: id,
    values: z.array(z.string()).min(1),
  }),
  z.object({
    op: z.literal("includes"),
    question: id,
    anyOf: z.array(z.string()).min(1),
  }),
  z.object({
    op: z.literal("gte"),
    question: id,
    value: z.number(),
  }),
  z.object({
    op: z.literal("lte"),
    question: id,
    value: z.number(),
  }),
]))

export {
  id,
  type Predicate,
  predicateSchema,
}
