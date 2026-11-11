import type { Bundle } from "@/clinical/schema/bundle"
import type { ProgramSummary } from "@/lib/contracts/program"

/*
 * Which session is next, and how the week is going. Pure, so it's easy to
 * test and works offline from cached data.
 */

/** A date as YYYY-MM-DD in the device's time zone. */
function localDate(date: Date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** The date `days` before a YYYY-MM-DD date. */
function daysBefore(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number)
  return localDate(new Date(year ?? 1970, (month ?? 1) - 1, (day ?? 1) - days))
}

/** The program's track, current phase, and the session it should do next. */
function nextSession(bundle: Bundle, program: Pick<ProgramSummary, "trackId" | "currentPhase" | "progress">) {
  const track = bundle.tracks.find(candidate => candidate.id === program.trackId)
  const phaseIndex = track?.phases.findIndex(phase => phase.id === program.currentPhase) ?? -1
  const phase = track?.phases[phaseIndex]
  if (track === undefined || phase === undefined) {
    return null
  }
  // Rotate through the phase's sessions in order.
  const session = phase.sessions[program.progress.completedInPhase % phase.sessions.length]
  if (session === undefined) {
    return null
  }
  return { track, phase, phaseIndex, session }
}

function doneOn(recentDates: ReadonlyArray<string>, date: string) {
  return recentDates.includes(date)
}

/** Sessions done in the 7 days ending `today`, counting each day once. */
function daysActiveThisWeek(recentDates: ReadonlyArray<string>, today: string) {
  const weekStart = daysBefore(today, 6)
  return new Set(recentDates.filter(date => date >= weekStart && date <= today)).size
}

export {
  daysActiveThisWeek,
  daysBefore,
  doneOn,
  localDate,
  nextSession,
}
