import { eq, inArray } from "drizzle-orm"

import { getDb } from "@/server/db/client"
import { GET as getProgram } from "@/app/api/program+api"
import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { POST as postSession } from "@/app/api/sessions+api"
import { GET as getContentById } from "@/app/api/content/[id]+api"
import { POST as postAssessment } from "@/app/api/assessments+api"
import { PUT as putAnswers } from "@/app/api/assessments/[id]/answers+api"
import { POST as postSubmit } from "@/app/api/assessments/[id]/submit+api"
import { createdAssessmentSchema } from "@/lib/contracts/assessment"
import { programResponseSchema, sessionLoggedSchema } from "@/lib/contracts/program"
import { contentVersions, exerciseLogs, safetyAggregates, sessionLogs, users } from "@/server/db/schema"

/*
 * Programs and session logging against the Neon dev branch, with Clerk
 * mocked. Uses its own content version and users, removed afterwards.
 */

jest.mock("@clerk/backend", () => ({
  createClerkClient: () => ({
    authenticateRequest: async (request: Request) => {
      const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? ""
      return token.startsWith("test:")
        ? {
            isAuthenticated: true,
            toAuth: () => ({
              userId: token.slice("test:".length),
            }),
          }
        : { isAuthenticated: false }
    },
  }),
}))

declare const process: { env: Record<string, string | undefined> }

const run = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const clerkIds: Array<string> = []
let contentVersionId = ""

function clerkUser(name: string) {
  const id = `test_${run}_${name}`
  clerkIds.push(id)
  return id
}

function authed(clerkId: string, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: { "Authorization": `Bearer test:${clerkId}`, "Content-Type": "application/json" },
  }
}

const clear = {
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
}

/** Gives the user an active `general` program in phase `calm`, through the real API. */
async function withProgram(clerkId: string) {
  const started = await postAssessment(new Request("http://localhost/api/assessments", authed(clerkId, {
    method: "POST",
    body: JSON.stringify({ contentVersionId }),
  })))
  const { id } = createdAssessmentSchema.parse(await started.json())
  await putAnswers(new Request(`http://localhost/api/assessments/${id}/answers`, authed(clerkId, {
    method: "PUT",
    body: JSON.stringify({ answers: clear }),
  })), { id })
  await postSubmit(new Request(`http://localhost/api/assessments/${id}/submit`, authed(clerkId, { method: "POST", body: "{}" })), { id })
  return program(clerkId)
}

async function program(clerkId: string) {
  const response = await getProgram(new Request("http://localhost/api/program", authed(clerkId)))
  expect(response.status).toBe(200)
  return programResponseSchema.parse(await response.json()).program
}

/** A random version 4 UUID (Node's crypto types aren't loaded in this project). */
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    return (char === "x"
      ? random
      : (random % 4) + 8).toString(16)
  })
}

function sessionLog(programId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    programId,
    sessionId: "calm-a",
    phaseId: "calm",
    scheduledDate: "2026-11-11",
    completedAt: new Date().toISOString(),
    painAfter: 3,
    exercises: [
      {
        position: 0,
        exerciseId: "pelvic-tilt",
        completed: true,
        setsDone: 2,
      },
      {
        position: 1,
        exerciseId: "knee-to-chest",
        completed: true,
        setsDone: 2,
      },
      {
        position: 2,
        exerciseId: "cat-cow",
        completed: false,
        setsDone: 0,
      },
      {
        position: 3,
        exerciseId: "walking",
        completed: true,
        setsDone: 1,
      },
    ],
    ...overrides,
  }
}

async function log(clerkId: string, body: unknown) {
  return postSession(new Request("http://localhost/api/sessions", authed(clerkId, {
    method: "POST",
    body: JSON.stringify(body),
  })))
}

beforeAll(async () => {
  if (process.env.CONTENT_CHANNEL !== "draft") {
    throw new Error("Program integration tests need CONTENT_CHANNEL=draft (see .env.example).")
  }
  const [version] = await getDb().insert(contentVersions).values({
    contentId: `test-${run}`,
    version: lbpBundle.version,
    bundle: lbpBundle,
    checksum: "test",
  }).returning()
  contentVersionId = version?.id ?? ""
})

afterAll(async () => {
  const db = getDb()
  if (clerkIds.length > 0) {
    await db.delete(users).where(inArray(users.clerkUserId, clerkIds))
  }
  if (contentVersionId !== "") {
    await db.delete(safetyAggregates).where(eq(safetyAggregates.contentVersionId, contentVersionId))
    await db.delete(contentVersions).where(eq(contentVersions.id, contentVersionId))
  }
})

describe("GET /api/program", () => {
  it("is null before the first program", async () => {
    expect(await program(clerkUser("none"))).toBeNull()
  })

  it("returns the active program with empty progress", async () => {
    const current = await withProgram(clerkUser("fresh"))

    expect(current).toMatchObject({
      status: "active",
      contentVersionId,
      trackId: "general",
      currentPhase: "calm",
      progress: { completedInPhase: 0, recentDates: [] },
    })
  })
})

describe("GET /api/content/:id", () => {
  it("serves the version a program is pinned to", async () => {
    const clerkId = clerkUser("content")
    await withProgram(clerkId)

    const response = await getContentById(new Request(`http://localhost/api/content/${contentVersionId}`, authed(clerkId)), { id: contentVersionId })

    expect(response.status).toBe(200)
  })

  it("answers 404 for an unknown or malformed ID", async () => {
    const clerkId = clerkUser("content-missing")

    const unknown = await getContentById(new Request("http://localhost/api/content/x", authed(clerkId)), { id: "00000000-0000-4000-8000-000000000000" })
    const malformed = await getContentById(new Request("http://localhost/api/content/x", authed(clerkId)), { id: "not-a-uuid" })

    expect([unknown.status, malformed.status]).toEqual([404, 404])
  })
})

describe("POST /api/sessions", () => {
  it("records a session with its exercises and counts it toward the phase", async () => {
    const clerkId = clerkUser("logs")
    const current = await withProgram(clerkId)
    const body = sessionLog(current?.id ?? "")

    const response = await log(clerkId, body)

    expect(response.status).toBe(201)
    expect(sessionLoggedSchema.parse(await response.json())).toEqual({ id: body.id, created: true })
    const exercises = await getDb().select().from(exerciseLogs).where(eq(exerciseLogs.sessionLogId, body.id))
    expect(exercises).toHaveLength(4)
    expect((await program(clerkId))?.progress).toEqual({
      completedInPhase: 1,
      recentDates: ["2026-11-11"],
    })
  })

  it("records a retried log once", async () => {
    const clerkId = clerkUser("retry")
    const current = await withProgram(clerkId)
    const body = sessionLog(current?.id ?? "")

    const first = await log(clerkId, body)
    const second = await log(clerkId, body)

    expect([first.status, second.status]).toEqual([201, 200])
    expect(sessionLoggedSchema.parse(await second.json()).created).toBe(false)
    const rows = await getDb().select().from(sessionLogs).where(eq(sessionLogs.id, body.id))
    expect(rows).toHaveLength(1)
  })

  it("records racing copies of a log once", async () => {
    const clerkId = clerkUser("race")
    const current = await withProgram(clerkId)
    const body = sessionLog(current?.id ?? "")

    await Promise.allSettled([
      log(clerkId, body),
      log(clerkId, body),
      log(clerkId, body),
    ])

    expect(await getDb().select().from(sessionLogs).where(eq(sessionLogs.id, body.id))).toHaveLength(1)
    expect(await getDb().select().from(exerciseLogs).where(eq(exerciseLogs.sessionLogId, body.id))).toHaveLength(4)
  })

  it("rejects a session that isn't in the program", async () => {
    const clerkId = clerkUser("wrong-session")
    const current = await withProgram(clerkId)

    expect((await log(clerkId, sessionLog(current?.id ?? "", { sessionId: "leg-calm-a" }))).status).toBe(400)
  })

  it("rejects exercises that don't match the session", async () => {
    const clerkId = clerkUser("wrong-exercises")
    const current = await withProgram(clerkId)

    const response = await log(clerkId, sessionLog(current?.id ?? "", {
      exercises: [
        {
          position: 0,
          exerciseId: "dead-bug",
          completed: true,
          setsDone: 3,
        },
      ],
    }))

    expect(response.status).toBe(400)
  })

  it("rejects a completion time in the future", async () => {
    const clerkId = clerkUser("future")
    const current = await withProgram(clerkId)

    const response = await log(clerkId, sessionLog(current?.id ?? "", {
      completedAt: new Date(Date.now() + 3_600_000).toISOString(),
    }))

    expect(response.status).toBe(400)
  })

  it("rejects a pain rating out of range", async () => {
    const clerkId = clerkUser("pain-range")
    const current = await withProgram(clerkId)

    expect((await log(clerkId, sessionLog(current?.id ?? "", { painAfter: 11 }))).status).toBe(400)
  })

  it("keeps other users' programs and log IDs out of reach", async () => {
    const owner = clerkUser("owner")
    const other = clerkUser("other")
    const ownerProgram = await withProgram(owner)
    const otherProgram = await withProgram(other)
    const ownersLog = sessionLog(ownerProgram?.id ?? "")
    await log(owner, ownersLog)

    expect((await log(other, sessionLog(ownerProgram?.id ?? ""))).status).toBe(404)
    expect((await log(other, { ...ownersLog, programId: otherProgram?.id })).status).toBe(409)
  })
})
