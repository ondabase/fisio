import type { Db } from "@/server/db/client"
import type { User } from "@/server/db/schema"

import { withUser } from "@/server/auth"
import { getDb } from "@/server/db/client"
import { getServerEnv } from "@/server/env"
import { findOrCreateUser } from "@/server/users"

/*
 * Unit tests for the auth wrapper, with Clerk, the env, and the database
 * mocked. The database tests live in me-api.integration.test.ts.
 */

const mockAuthenticateRequest = jest.fn()

jest.mock("@clerk/backend", () => ({
  createClerkClient: () => ({ authenticateRequest: mockAuthenticateRequest }),
}))
jest.mock("@/server/env", () => ({
  getServerEnv: jest.fn(),
}))
jest.mock("@/server/db/client", () => ({
  getDb: jest.fn(),
}))
jest.mock("@/server/users", () => ({
  findOrCreateUser: jest.fn(),
}))

const testEnv = {
  DATABASE_URL: "postgres://test",
  CLERK_SECRET_KEY: "sk_test",
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test",
}

const user: User = {
  id: "00000000-0000-4000-8000-000000000001",
  clerkUserId: "user_1",
  createdAt: new Date(),
  consentVersion: null,
  consentedAt: null,
}

const db = {} as Db

function signedIn(userId: string) {
  return {
    isAuthenticated: true,
    toAuth: () => ({ userId }),
  }
}

const signedOut = { isAuthenticated: false, reason: "session-token-invalid" }

const handler = jest.fn(async () => Response.json({ ok: true }))
const route = withUser(handler)
function request() {
  return new Request("http://localhost/api/test", {
    headers: { Authorization: "Bearer token" },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(getServerEnv).mockReturnValue(testEnv)
  jest.mocked(getDb).mockReturnValue(db)
  jest.mocked(findOrCreateUser).mockResolvedValue(user)
})

describe("withUser", () => {
  it("rejects a signed-out request with 401 before touching the database", async () => {
    mockAuthenticateRequest.mockResolvedValue(signedOut)

    const response = await route(request())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: "unauthorized", message: "Sign in to continue." },
    })
    expect(getDb).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it("treats a token verification error as signed out", async () => {
    mockAuthenticateRequest.mockRejectedValue(new Error("JWKS fetch failed"))

    const response = await route(request())

    expect(response.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it("throws on a misconfigured server instead of answering 401", async () => {
    // The Clerk client is cached after first use, so load a fresh copy of the
    // module graph, where reading the env runs (and fails) again.
    let freshRoute: ReturnType<typeof withUser> | undefined
    jest.isolateModules(() => {
      const env = jest.requireMock<{ getServerEnv: jest.Mock }>("@/server/env")
      env.getServerEnv.mockImplementation(() => {
        throw new Error("Invalid server environment: DATABASE_URL.")
      })
      freshRoute = jest.requireActual<{ withUser: typeof withUser }>("@/server/auth").withUser(handler)
    })

    await expect(freshRoute?.(request())).rejects.toThrow("Invalid server environment")
    expect(handler).not.toHaveBeenCalled()
  })

  it("accepts only session tokens", async () => {
    mockAuthenticateRequest.mockResolvedValue(signedIn("user_1"))

    await route(request())

    expect(mockAuthenticateRequest).toHaveBeenCalledWith(expect.any(Request), { acceptsToken: "session_token" })
  })

  it("resolves the internal user and passes it to the handler", async () => {
    mockAuthenticateRequest.mockResolvedValue(signedIn("user_1"))
    const req = request()

    const response = await route(req, { id: "42" })

    expect(response.status).toBe(200)
    expect(findOrCreateUser).toHaveBeenCalledWith(db, "user_1")
    expect(handler).toHaveBeenCalledWith({
      request: req,
      params: { id: "42" },
      user,
      db,
    })
  })
})
