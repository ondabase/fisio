import type { SessionLogRequest } from "@/lib/contracts/program"

import { ApiError } from "@/lib/api"
import { enqueueSession, flushSessions, pendingSessions } from "@/features/sessions/outbox"

/* An in-memory stand-in for the device's SQLite key-value store. */
const mockStore = new Map<string, string>()

jest.mock("@/lib/device-storage", () => ({
  deviceStorage: {
    getItemAsync: async (key: string) => mockStore.get(key) ?? null,
    setItemAsync: async (key: string, value: string | ((previous: string | null) => string)) => {
      mockStore.set(key, typeof value === "function"
        ? value(mockStore.get(key) ?? null)
        : value)
    },
  },
}))

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({}),
}))

function log(id: string): SessionLogRequest {
  return {
    id,
    programId: "00000000-0000-4000-8000-000000000001",
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
}

const user = "user_1"

beforeEach(() => {
  mockStore.clear()
})

describe("session outbox", () => {
  it("keeps logs in order, per user", async () => {
    await enqueueSession(user, log("a"))
    await enqueueSession(user, log("b"))
    await enqueueSession("user_2", log("c"))

    expect((await pendingSessions(user)).map(entry => entry.id)).toEqual(["a", "b"])
    expect((await pendingSessions("user_2")).map(entry => entry.id)).toEqual(["c"])
  })

  it("keeps one copy of a log added twice", async () => {
    await enqueueSession(user, log("a"))
    await enqueueSession(user, log("a"))

    expect(await pendingSessions(user)).toHaveLength(1)
  })

  it("sends every log in order and empties the outbox", async () => {
    await enqueueSession(user, log("a"))
    await enqueueSession(user, log("b"))
    const sent: Array<string> = []

    const count = await flushSessions(user, async (entry) => {
      sent.push(entry.id)
    })

    expect(count).toBe(2)
    expect(sent).toEqual(["a", "b"])
    expect(await pendingSessions(user)).toEqual([])
  })

  it("stops at a network failure and keeps the rest for later", async () => {
    await enqueueSession(user, log("a"))
    await enqueueSession(user, log("b"))

    const count = await flushSessions(user, async () => {
      throw new ApiError(0, "network", "Offline")
    })

    expect(count).toBe(0)
    expect((await pendingSessions(user)).map(entry => entry.id)).toEqual(["a", "b"])
  })

  it.each([401, 429, 500, 503])("keeps a log the server answered %i to", async (status) => {
    await enqueueSession(user, log("a"))

    await flushSessions(user, async () => {
      throw new ApiError(status, "error", "Try later")
    })

    expect(await pendingSessions(user)).toHaveLength(1)
  })

  it("drops a log the server rejected, so it can't block the others", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
    await enqueueSession(user, log("bad"))
    await enqueueSession(user, log("good"))
    const sent: Array<string> = []

    await flushSessions(user, async (entry) => {
      if (entry.id === "bad") {
        throw new ApiError(400, "invalid_request", "Rejected")
      }
      sent.push(entry.id)
    })

    expect(sent).toEqual(["good"])
    expect(await pendingSessions(user)).toEqual([])
  })

  it("never sends a log twice when flushes overlap", async () => {
    await enqueueSession(user, log("a"))
    const send = jest.fn(async () => undefined)

    await Promise.all([
      flushSessions(user, send),
      flushSessions(user, send),
      flushSessions(user, send),
    ])

    expect(send).toHaveBeenCalledTimes(1)
  })

  it("survives a corrupt saved value", async () => {
    mockStore.set(`outbox:sessions:${user}`, "{not json")

    expect(await pendingSessions(user)).toEqual([])
  })
})
