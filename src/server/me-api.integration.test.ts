import { inArray } from "drizzle-orm"

import { getDb } from "@/server/db/client"
import { users } from "@/server/db/schema"
import { meSchema } from "@/lib/contracts/me"
import { CURRENT_CONSENT_VERSION } from "@/lib/consent"
import { GET as getMe } from "@/app/api/me+api"
import { POST as postConsent } from "@/app/api/me/consent+api"

/*
 * The /api/me routes against a real database (the Neon dev branch from
 * DATABASE_URL). Only Clerk is mocked: a `test:<id>` bearer token stands in
 * for a verified session of Clerk user `<id>`. Run with
 * `npm run test:integration`; rows created here are deleted afterwards.
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

// Read from the shell or `.env` (loaded by the npm script). Node's types
// aren't loaded in this project, so declare the part used here.
declare const process: { env: Record<string, string | undefined> }

const run = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createdClerkIds: Array<string> = []

/** A fresh Clerk user ID for this test run. */
function clerkUser(name: string) {
  const id = `test_${run}_${name}`
  createdClerkIds.push(id)
  return id
}

async function get(clerkUserId: string | null) {
  const headers: Record<string, string> = clerkUserId === null
    ? {}
    : { Authorization: `Bearer test:${clerkUserId}` }
  return getMe(new Request("http://localhost/api/me", { headers }))
}

async function consent(clerkUserId: string, body: unknown) {
  return postConsent(new Request("http://localhost/api/me/consent", {
    method: "POST",
    headers: {
      "Authorization": `Bearer test:${clerkUserId}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }))
}

/** Reads a response as the shared contract, so the shape is checked too. */
async function readMe(response: Response) {
  expect(response.status).toBe(200)
  return meSchema.parse(await response.json())
}

const validConsent = { consentVersion: CURRENT_CONSENT_VERSION, adultAttested: true }

beforeAll(() => {
  if (process.env.DATABASE_URL === undefined) {
    throw new Error("Integration tests need DATABASE_URL (a Neon dev branch). Add it to .env.")
  }
})

afterAll(async () => {
  if (createdClerkIds.length > 0) {
    await getDb().delete(users).where(inArray(users.clerkUserId, createdClerkIds))
  }
})

describe("GET /api/me", () => {
  it("rejects a request without a token", async () => {
    const response = await get(null)

    expect(response.status).toBe(401)
  })

  it("creates the user on the first call and returns the same user after", async () => {
    const clerkId = clerkUser("first-call")

    const first = await readMe(await get(clerkId))
    const second = await readMe(await get(clerkId))

    expect(first.consentVersion).toBeNull()
    expect(first.consentedAt).toBeNull()
    expect(first.hasCurrentConsent).toBe(false)
    expect(second.id).toBe(first.id)
    const rows = await getDb().select().from(users).where(inArray(users.clerkUserId, [clerkId]))
    expect(rows).toHaveLength(1)
  })

  it("creates one user when the first requests arrive together", async () => {
    const clerkId = clerkUser("concurrent")

    const responses = await Promise.all([
      get(clerkId),
      get(clerkId),
      get(clerkId),
    ])
    const ids = await Promise.all(responses.map(async response => (await readMe(response)).id))

    expect(new Set(ids).size).toBe(1)
  })
})

describe("POST /api/me/consent", () => {
  it("records consent to the current version", async () => {
    const clerkId = clerkUser("consents")

    const me = await readMe(await consent(clerkId, validConsent))

    expect(me.consentVersion).toBe(CURRENT_CONSENT_VERSION)
    expect(me.hasCurrentConsent).toBe(true)
    const after = await readMe(await get(clerkId))
    expect(after.hasCurrentConsent).toBe(true)
    expect(after.consentedAt).not.toBeNull()
  })

  it("rejects consent without the 18+ attestation", async () => {
    const clerkId = clerkUser("minor")

    const response = await consent(clerkId, { consentVersion: CURRENT_CONSENT_VERSION, adultAttested: false })

    expect(response.status).toBe(400)
    expect((await readMe(await get(clerkId))).hasCurrentConsent).toBe(false)
  })

  it("rejects an outdated consent version", async () => {
    const clerkId = clerkUser("outdated")

    const response = await consent(clerkId, { consentVersion: "2020-01-01", adultAttested: true })

    expect(response.status).toBe(409)
    expect((await readMe(await get(clerkId))).hasCurrentConsent).toBe(false)
  })

  it("rejects a body that isn't JSON", async () => {
    const clerkId = clerkUser("bad-json")

    const response = await postConsent(new Request("http://localhost/api/me/consent", {
      method: "POST",
      headers: { Authorization: `Bearer test:${clerkId}` },
      body: "not json",
    }))

    expect(response.status).toBe(400)
  })

  it("only changes the requesting user", async () => {
    const alice = clerkUser("alice")
    const bob = clerkUser("bob")
    const bobBefore = await readMe(await get(bob))

    await readMe(await consent(alice, validConsent))

    const aliceAfter = await readMe(await get(alice))
    const bobAfter = await readMe(await get(bob))
    expect(aliceAfter.hasCurrentConsent).toBe(true)
    expect(aliceAfter.id).not.toBe(bobBefore.id)
    expect(bobAfter).toEqual(bobBefore)
  })
})
