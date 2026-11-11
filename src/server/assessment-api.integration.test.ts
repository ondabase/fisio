import { and, eq, inArray } from "drizzle-orm"

import { getDb } from "@/server/db/client"
import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { GET as getContent } from "@/app/api/content/current+api"
import { POST as postAssessment } from "@/app/api/assessments+api"
import { PUT as putAnswers } from "@/app/api/assessments/[id]/answers+api"
import { POST as postSubmit } from "@/app/api/assessments/[id]/submit+api"
import { assessmentResultSchema, createdAssessmentSchema, currentContentSchema } from "@/lib/contracts/assessment"
import { assessments, contentVersions, programs, safetyAggregates, safetyFlags, users } from "@/server/db/schema"

/*
 * The assessment API against the Neon dev branch, with Clerk mocked (a
 * `test:<id>` bearer token is a session for Clerk user `<id>`). Uses its own
 * content version and users, removed afterwards. Needs CONTENT_CHANNEL=draft.
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

async function start(clerkId: string, versionId = contentVersionId) {
  return postAssessment(new Request("http://localhost/api/assessments", authed(clerkId, {
    method: "POST",
    body: JSON.stringify({ contentVersionId: versionId }),
  })))
}

async function startOk(clerkId: string) {
  const response = await start(clerkId)
  expect(response.status).toBe(201)
  return createdAssessmentSchema.parse(await response.json()).id
}

async function save(clerkId: string, id: string, answers: Record<string, unknown>) {
  return putAnswers(new Request(`http://localhost/api/assessments/${id}/answers`, authed(clerkId, {
    method: "PUT",
    body: JSON.stringify({ answers }),
  })), { id })
}

async function submit(clerkId: string, id: string, clientOutcome?: string) {
  return postSubmit(new Request(`http://localhost/api/assessments/${id}/submit`, authed(clerkId, {
    method: "POST",
    body: JSON.stringify(clientOutcome === undefined
      ? {}
      : { clientOutcome }),
  })), { id })
}

async function submitOk(clerkId: string, id: string) {
  const response = await submit(clerkId, id)
  expect(response.status).toBe(200)
  return assessmentResultSchema.parse(await response.json())
}

/** Starts, answers, and submits in one go. */
async function complete(clerkId: string, answers: Record<string, unknown>) {
  const id = await startOk(clerkId)
  expect((await save(clerkId, id, answers)).status).toBe(204)
  return submitOk(clerkId, id)
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

async function aggregateCount(ruleId: string, outcome: "eligible" | "refer" | "urgent") {
  const rows = await getDb().select().from(safetyAggregates).where(and(
    eq(safetyAggregates.contentVersionId, contentVersionId),
    eq(safetyAggregates.ruleId, ruleId),
    eq(safetyAggregates.outcome, outcome),
  ))
  return rows.reduce((sum, row) => sum + row.count, 0)
}

beforeAll(async () => {
  if (process.env.CONTENT_CHANNEL !== "draft") {
    throw new Error("Assessment integration tests need CONTENT_CHANNEL=draft (see .env.example).")
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

describe("GET /api/content/current", () => {
  it("serves a servable version with a valid bundle", async () => {
    const response = await getContent(new Request("http://localhost/api/content/current", authed(clerkUser("content"))))

    expect(response.status).toBe(200)
    expect(currentContentSchema.parse(await response.json()).bundle.id).toBe("lbp")
  })

  it("answers 404 for a pack with no servable version", async () => {
    const response = await getContent(new Request("http://localhost/api/content/current?content=nothing", authed(clerkUser("no-content"))))

    expect(response.status).toBe(404)
  })
})

describe("starting an assessment", () => {
  it("rejects an unknown content version", async () => {
    const response = await start(clerkUser("unknown-version"), "00000000-0000-4000-8000-000000000000")

    expect(response.status).toBe(409)
  })

  it("abandons the previous unfinished assessment", async () => {
    const clerkId = clerkUser("restart")
    const first = await startOk(clerkId)
    await startOk(clerkId)

    const response = await submit(clerkId, first)

    expect(response.status).toBe(409)
  })
})

describe("saving answers", () => {
  it("rejects an answer to an unknown question", async () => {
    const clerkId = clerkUser("unknown-question")
    const id = await startOk(clerkId)

    expect((await save(clerkId, id, { "favorite-color": "blue" })).status).toBe(400)
  })

  it("rejects an answer that doesn't fit its question", async () => {
    const clerkId = clerkUser("bad-answer")
    const id = await startOk(clerkId)

    expect((await save(clerkId, id, { "pain-intensity": 42 })).status).toBe(400)
  })

  it("keeps another user's assessment out of reach", async () => {
    const owner = clerkUser("owner")
    const other = clerkUser("other")
    const id = await startOk(owner)

    expect((await save(other, id, clear)).status).toBe(404)
    expect((await submit(other, id)).status).toBe(404)
  })
})

describe("submitting", () => {
  it("records an eligible result with a program", async () => {
    const before = await aggregateCount("*", "eligible")

    const result = await complete(clerkUser("eligible"), clear)

    expect(result).toMatchObject({
      outcome: "eligible",
      flags: [],
      trackId: "general",
      startPhase: "calm",
    })
    expect(result.programId).not.toBeNull()
    const [program] = await getDb().select().from(programs).where(eq(programs.id, result.programId ?? ""))
    expect(program).toMatchObject({ status: "active", trackId: "general", currentPhase: "calm" })
    const [assessment] = await getDb().select().from(assessments).where(eq(assessments.id, result.id))
    expect(assessment).toMatchObject({
      status: "completed",
      outcome: "eligible",
      bodyRegions: ["lower-back"],
    })
    expect(assessment?.engineTrace).toEqual(expect.arrayContaining([
      {
        kind: "track",
        rule: 2,
        track: "general",
        phase: "calm",
      },
    ]))
    expect(await aggregateCount("*", "eligible")).toBe(before + 1)
  })

  it("records an urgent early stop with no program", async () => {
    const result = await complete(clerkUser("urgent"), {
      "pain-regions": ["lower-back"],
      "saddle-numbness": true,
    })

    expect(result).toMatchObject({
      outcome: "urgent",
      flags: [
        { ruleId: "saddle-numbness", severity: "urgent" },
      ],
      programId: null,
    })
    expect(await aggregateCount("saddle-numbness", "urgent")).toBeGreaterThanOrEqual(1)
  })

  it("records a refer result with its flags", async () => {
    const result = await complete(clerkUser("refer"), { ...clear, "fever": true, "cancer-history": true })

    expect(result.outcome).toBe("refer")
    expect(result.flags.map(flag => flag.ruleId).sort()).toEqual(["cancer-history", "possible-infection"])
    const flags = await getDb().select().from(safetyFlags).where(eq(safetyFlags.assessmentId, result.id))
    expect(flags).toHaveLength(2)
  })

  it("uses the server's evaluation, whatever the app claims", async () => {
    const clerkId = clerkUser("claims-eligible")
    const id = await startOk(clerkId)
    await save(clerkId, id, {
      "pain-regions": ["lower-back"],
      "saddle-numbness": true,
    })

    const response = await submit(clerkId, id, "eligible")

    expect(assessmentResultSchema.parse(await response.json()).outcome).toBe("urgent")
  })

  it("ignores answers to questions the user wasn't asked", async () => {
    const result = await complete(clerkUser("extra-answers"), { ...clear, "leg-symptoms": "leg-more" })

    expect(result.trackId).toBe("general")
  })

  it("refuses an incomplete assessment", async () => {
    const clerkId = clerkUser("incomplete")
    const id = await startOk(clerkId)
    await save(clerkId, id, {
      "pain-regions": ["lower-back"],
    })

    const response = await submit(clerkId, id)

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      error: { code: "incomplete" },
    })
  })

  it("returns the stored result on a repeat submit, counting it once", async () => {
    const clerkId = clerkUser("repeat")
    const first = await complete(clerkId, { ...clear, trauma: true })
    const count = await aggregateCount("significant-trauma", "refer")

    const again = await submitOk(clerkId, first.id)

    expect(again).toEqual(first)
    expect(await aggregateCount("significant-trauma", "refer")).toBe(count)
  })

  it("records a result once when submits race", async () => {
    const clerkId = clerkUser("race")
    const id = await startOk(clerkId)
    await save(clerkId, id, clear)

    const responses = await Promise.allSettled([
      submit(clerkId, id),
      submit(clerkId, id),
      submit(clerkId, id),
    ])

    expect(responses.some(response => response.status === "fulfilled" && response.value.status === 200)).toBe(true)
    const programRows = await getDb().select().from(programs).where(eq(programs.assessmentId, id))
    expect(programRows).toHaveLength(1)
  })

  it("replaces the active program after a new eligible result, and stops it after a refer", async () => {
    const clerkId = clerkUser("reassess")
    const first = await complete(clerkId, clear)
    const second = await complete(clerkId, {
      ...clear,
      "duration": "over-12-weeks",
      "pain-intensity": 2,
      "daily-impact": 2,
    })

    const [firstProgram] = await getDb().select().from(programs).where(eq(programs.id, first.programId ?? ""))
    expect(firstProgram?.status).toBe("completed")
    expect(second).toMatchObject({ trackId: "general", startPhase: "build" })

    await complete(clerkId, { ...clear, "night-pain": true })
    const [secondProgram] = await getDb().select().from(programs).where(eq(programs.id, second.programId ?? ""))
    expect(secondProgram?.status).toBe("stopped_referred")
  })
})
