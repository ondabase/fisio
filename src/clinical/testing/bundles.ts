import type { Bundle, BundleInput } from "@/clinical/schema/bundle"

import { lbpContent } from "@/clinical/content/lbp/content"
import { bundleObjectSchema, bundleSchema } from "@/clinical/schema/bundle"

/*
 * Test helpers: copies of the draft LBP content with a change applied. Tests
 * only; nothing in the app imports this.
 */

type Edit = (content: BundleInput) => void

function editedContent(edit: Edit): BundleInput {
  // Content is plain JSON, so a JSON round trip is a deep copy.
  const content = JSON.parse(JSON.stringify(lbpContent)) as BundleInput
  edit(content)
  return content
}

/** A valid bundle: shape and integrity checks both pass. */
function bundleWith(edit: Edit): Bundle {
  return bundleSchema.parse(editedContent(edit))
}

/**
 * A bundle that skips the integrity checks, for testing the engine's own
 * guards against content that should never reach it.
 */
function unvalidatedBundleWith(edit: Edit): Bundle {
  return bundleObjectSchema.parse(editedContent(edit))
}

type QuestionInput = BundleInput["assessment"]["questions"][number]

/** Replaces the edges of the question with this ID. */
function setNext(questions: Array<QuestionInput>, id: string, next: QuestionInput["next"]) {
  const question = questions.find(candidate => candidate.id === id)
  if (question === undefined) {
    throw new Error(`No question "${id}" to edit.`)
  }
  question.next = next
}

/** The integrity issues a change causes. */
function issuesFor(edit: Edit): Array<string> {
  const result = bundleSchema.safeParse(editedContent(edit))
  return result.success
    ? []
    : result.error.issues.map(issue => issue.message)
}

export {
  bundleWith,
  editedContent,
  issuesFor,
  setNext,
  unvalidatedBundleWith,
}
