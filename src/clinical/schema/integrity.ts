import type { Predicate } from "@/clinical/schema/predicate"
import type { Bundle, Question, Questionnaire, SafetyRule } from "@/clinical/schema/bundle"

/*
 * Cross-reference checks the shape schema can't express. A bundle that
 * fails any of these is rejected before the engine sees it, so the engine
 * can rely on every reference resolving and every walk terminating.
 */

function duplicates(ids: Array<string>) {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) {
      repeated.add(id)
    }
    seen.add(id)
  }
  return [...repeated]
}

function checkUnique(label: string, ids: Array<string>, issues: Array<string>) {
  for (const id of duplicates(ids)) {
    issues.push(`${label}: duplicate ID "${id}"`)
  }
}

/** Checks that each leaf refers to a real question and fits its answer type. */
function checkPredicate(
  predicate: Predicate,
  questions: Map<string, Question>,
  regionIds: Set<string>,
  where: string,
  issues: Array<string>,
) {
  if (predicate.op === "all" || predicate.op === "any") {
    for (const child of predicate.of) {
      checkPredicate(child, questions, regionIds, where, issues)
    }
    return
  }
  if (predicate.op === "not") {
    checkPredicate(predicate.of, questions, regionIds, where, issues)
    return
  }

  const question = questions.get(predicate.question)
  if (question === undefined) {
    issues.push(`${where}: unknown question "${predicate.question}"`)
    return
  }

  const optionIds = question.type === "single" || question.type === "multi"
    ? new Set(question.options.map(option => option.id))
    : regionIds

  switch (predicate.op) {
    case "eq": {
      const fits = (question.type === "single" && typeof predicate.value === "string" && optionIds.has(predicate.value))
        || (question.type === "yes-no" && typeof predicate.value === "boolean")
        || (question.type === "scale" && typeof predicate.value === "number" && predicate.value >= question.min && predicate.value <= question.max)
      if (!fits) {
        issues.push(`${where}: "eq" value doesn't fit ${question.type} question "${question.id}"`)
      }
      return
    }
    case "in":
      if (question.type !== "single") {
        issues.push(`${where}: "in" needs a single-choice question, but "${question.id}" is ${question.type}`)
        return
      }
      for (const value of predicate.values.filter(value => !optionIds.has(value))) {
        issues.push(`${where}: "${value}" isn't an option of "${question.id}"`)
      }
      return
    case "includes":
      if (question.type !== "multi" && question.type !== "body-map") {
        issues.push(`${where}: "includes" needs a multi-choice or body-map question, but "${question.id}" is ${question.type}`)
        return
      }
      for (const value of predicate.anyOf.filter(value => !optionIds.has(value))) {
        issues.push(`${where}: "${value}" isn't an option or region of "${question.id}"`)
      }
      return
    case "gte":
    case "lte":
      if (question.type !== "scale") {
        issues.push(`${where}: "${predicate.op}" needs a scale question, but "${question.id}" is ${question.type}`)
      }
  }
}

/** True when the questions reachable from `from` loop back on themselves. */
function hasCycle(from: string, questions: Map<string, Question>, visiting: Set<string>, done: Set<string>): boolean {
  if (done.has(from)) {
    return false
  }
  if (visiting.has(from)) {
    return true
  }
  visiting.add(from)
  const question = questions.get(from)
  const targets = question?.next.map(edge => edge.goto).filter(goto => goto !== "complete") ?? []
  const cycle = targets.some(target => hasCycle(target, questions, visiting, done))
  visiting.delete(from)
  done.add(from)
  return cycle
}

function checkQuestionnaire(
  name: string,
  questionnaire: Questionnaire,
  safetyRules: Array<SafetyRule>,
  regionIds: Set<string>,
  issues: Array<string>,
) {
  const own: Array<string> = []
  checkQuestionnaireGraph(name, questionnaire, safetyRules, regionIds, own)
  issues.push(...own)
}

/* Reports into its own list, so a broken graph skips the walk checks below. */
function checkQuestionnaireGraph(
  name: string,
  questionnaire: Questionnaire,
  safetyRules: Array<SafetyRule>,
  regionIds: Set<string>,
  issues: Array<string>,
) {
  checkUnique(`${name} questions`, questionnaire.questions.map(question => question.id), issues)
  const questions = new Map(questionnaire.questions.map(question => [question.id, question]))

  if (!questions.has(questionnaire.start)) {
    issues.push(`${name}: start question "${questionnaire.start}" doesn't exist`)
    return
  }

  for (const question of questionnaire.questions) {
    const where = `${name} question "${question.id}"`
    question.next.forEach((edge, index) => {
      const isLast = index === question.next.length - 1
      if (isLast && edge.when !== undefined) {
        issues.push(`${where}: the last edge must have no "when", so every answer leads somewhere`)
      }
      if (!isLast && edge.when === undefined) {
        issues.push(`${where}: edge ${index + 1} has no "when", so the edges after it never apply`)
      }
      if (edge.goto !== "complete" && !questions.has(edge.goto)) {
        issues.push(`${where}: goes to unknown question "${edge.goto}"`)
      }
      if (edge.when !== undefined) {
        checkPredicate(edge.when, questions, regionIds, `${where} edge ${index + 1}`, issues)
      }
    })
    if (question.type === "scale" && question.min >= question.max) {
      issues.push(`${where}: min must be less than max`)
    }
  }

  if (issues.length > 0) {
    return
  }

  if (hasCycle(questionnaire.start, questions, new Set(), new Set())) {
    issues.push(`${name}: the questions loop back on themselves`)
    return
  }

  const reachable = new Set<string>()
  const queue = [questionnaire.start]
  for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
    if (current === "complete" || reachable.has(current)) {
      continue
    }
    reachable.add(current)
    queue.push(...(questions.get(current)?.next.map(edge => edge.goto) ?? []))
  }
  for (const question of questionnaire.questions.filter(question => !reachable.has(question.id))) {
    issues.push(`${name}: question "${question.id}" can't be reached from the start`)
  }

  for (const rule of safetyRules) {
    if (rule.earlyStop && rule.severity !== "urgent") {
      issues.push(`${name} safety rule "${rule.id}": only urgent rules can stop early`)
    }
    checkPredicate(rule.when, questions, regionIds, `${name} safety rule "${rule.id}"`, issues)
  }
}

/** Every problem with the bundle's cross-references, as readable messages. Empty when valid. */
function checkBundleIntegrity(bundle: Bundle): Array<string> {
  const issues: Array<string> = []
  const regionIds = new Set(bundle.regions.map(region => region.id))

  checkUnique("regions", bundle.regions.map(region => region.id), issues)
  checkUnique("safety rules", [
    ...bundle.safetyRules,
    ...bundle.checkIn.safetyRules,
  ].map(rule => rule.id), issues)
  checkUnique("exercises", bundle.exercises.map(exercise => exercise.id), issues)
  checkUnique("tracks", bundle.tracks.map(track => track.id), issues)
  checkUnique("check-in rules", bundle.checkIn.rules.map(rule => rule.id), issues)

  checkQuestionnaire("assessment", bundle.assessment, bundle.safetyRules, regionIds, issues)
  checkQuestionnaire("check-in", bundle.checkIn.questionnaire, bundle.checkIn.safetyRules, regionIds, issues)

  const assessmentQuestions = new Map(bundle.assessment.questions.map(question => [question.id, question]))
  const checkInQuestions = new Map(bundle.checkIn.questionnaire.questions.map(question => [question.id, question]))
  const exerciseIds = new Set(bundle.exercises.map(exercise => exercise.id))

  for (const track of bundle.tracks) {
    checkUnique(`track "${track.id}" phases`, track.phases.map(phase => phase.id), issues)
    for (const phase of track.phases) {
      checkUnique(`track "${track.id}" phase "${phase.id}" sessions`, phase.sessions.map(session => session.id), issues)
      for (const dose of phase.sessions.flatMap(session => session.doses)) {
        if (!exerciseIds.has(dose.exercise)) {
          issues.push(`track "${track.id}" phase "${phase.id}": unknown exercise "${dose.exercise}"`)
        }
      }
    }
  }

  bundle.trackRules.forEach((rule, index) => {
    const where = `track rule ${index + 1}`
    const isLast = index === bundle.trackRules.length - 1
    if (isLast && rule.when !== undefined) {
      issues.push(`${where}: the last track rule must have no "when", so every eligible user gets a track`)
    }
    if (!isLast && rule.when === undefined) {
      issues.push(`${where}: has no "when", so the track rules after it never apply`)
    }
    const track = bundle.tracks.find(candidate => candidate.id === rule.track)
    if (track === undefined) {
      issues.push(`${where}: unknown track "${rule.track}"`)
    }
    else if (!track.phases.some(phase => phase.id === rule.phase)) {
      issues.push(`${where}: track "${rule.track}" has no phase "${rule.phase}"`)
    }
    if (rule.when !== undefined) {
      checkPredicate(rule.when, assessmentQuestions, regionIds, where, issues)
    }
  })

  checkPredicate(bundle.checkIn.worsening, checkInQuestions, regionIds, "check-in worsening", issues)
  bundle.checkIn.rules.forEach((rule, index) => {
    const where = `check-in rule "${rule.id}"`
    const isLast = index === bundle.checkIn.rules.length - 1
    if (isLast && rule.when !== undefined) {
      issues.push(`${where}: the last check-in rule must have no "when", so every check-in gets a decision`)
    }
    if (!isLast && rule.when === undefined) {
      issues.push(`${where}: has no "when", so the rules after it never apply`)
    }
    if (rule.when !== undefined) {
      checkPredicate(rule.when, checkInQuestions, regionIds, where, issues)
    }
  })

  return issues
}

export { checkBundleIntegrity }
