import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { withPending } from "@/features/program/api"
import { daysActiveThisWeek, daysBefore, doneOn, localDate, nextSession } from "@/features/program/schedule"

jest.mock("@/lib/device-storage", () => ({ deviceStorage: {} }))

const program = {
  id: "00000000-0000-4000-8000-000000000001",
  status: "active" as const,
  contentVersionId: "00000000-0000-4000-8000-000000000002",
  trackId: "general",
  currentPhase: "calm",
  startedAt: "2026-11-01T10:00:00.000Z",
  progress: { completedInPhase: 0, recentDates: [] },
}

describe("dates", () => {
  it("formats a local date", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05")
  })

  it("counts back across months and years", () => {
    expect(daysBefore("2026-03-01", 1)).toBe("2026-02-28")
    expect(daysBefore("2026-01-03", 6)).toBe("2025-12-28")
  })

  it("knows whether a day had a session", () => {
    expect(doneOn(["2026-11-11", "2026-11-09"], "2026-11-11")).toBe(true)
    expect(doneOn(["2026-11-09"], "2026-11-11")).toBe(false)
  })

  it("counts active days in the last 7, once per day", () => {
    const dates = [
      "2026-11-11",
      "2026-11-11",
      "2026-11-08",
      "2026-11-05",
      "2026-11-04",
    ]

    expect(daysActiveThisWeek(dates, "2026-11-11")).toBe(3)
  })
})

describe("nextSession", () => {
  it("picks the current phase's session", () => {
    expect(nextSession(lbpBundle, program)).toMatchObject({
      phaseIndex: 0,
      phase: { id: "calm" },
      session: { id: "calm-a" },
    })
  })

  it("rotates through the phase's sessions", () => {
    // The draft content has one session per phase, so it repeats.
    const later = {
      ...program,
      progress: { completedInPhase: 5, recentDates: [] },
    }

    expect(nextSession(lbpBundle, later)?.session.id).toBe("calm-a")
  })

  it("is null for a phase the content doesn't have", () => {
    expect(nextSession(lbpBundle, { ...program, currentPhase: "advanced" })).toBeNull()
  })
})

describe("withPending", () => {
  const pending = {
    id: "00000000-0000-4000-8000-000000000003",
    programId: program.id,
    sessionId: "calm-a",
    phaseId: "calm",
    scheduledDate: "2026-11-11",
    completedAt: "2026-11-11T18:00:00.000Z",
    painAfter: 2,
    exercises: [
      {
        position: 0,
        exerciseId: "pelvic-tilt",
        completed: true,
        setsDone: 2,
      },
    ],
  }

  it("counts unsynced sessions toward progress", () => {
    const merged = withPending({
      ...program,
      progress: {
        completedInPhase: 1,
        recentDates: ["2026-11-10"],
      },
    }, [pending])

    expect(merged.progress).toEqual({
      completedInPhase: 2,
      recentDates: ["2026-11-11", "2026-11-10"],
    })
  })

  it("ignores another program's sessions", () => {
    expect(withPending(program, [
      { ...pending, programId: "00000000-0000-4000-8000-000000000009" },
    ])).toBe(program)
  })

  it("dates a session from another phase without counting it toward this one", () => {
    expect(withPending(program, [
      { ...pending, phaseId: "build" },
    ]).progress).toEqual({
      completedInPhase: 0,
      recentDates: ["2026-11-11"],
    })
  })
})
