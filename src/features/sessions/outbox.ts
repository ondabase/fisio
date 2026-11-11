import type { SessionLogRequest } from "@/lib/contracts/program"

import { ApiError } from "@/lib/api"
import { deviceStorage } from "@/lib/device-storage"

/*
 * The offline outbox for completed sessions. A session is saved here first,
 * then sent in order whenever the network allows. Each log carries an
 * app-generated ID and the server records an ID once, so resending after a
 * lost response never duplicates it.
 */

function key(userId: string) {
  return `outbox:sessions:${userId}`
}

function parse(value: string | null): Array<SessionLogRequest> {
  if (value === null) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed as Array<SessionLogRequest>
      : []
  }
  catch {
    return []
  }
}

/** The user's logs waiting to be sent, oldest first. */
async function pendingSessions(userId: string): Promise<Array<SessionLogRequest>> {
  return parse(await deviceStorage.getItemAsync(key(userId)))
}

/** Adds a log, unless one with the same ID is already waiting. */
async function enqueueSession(userId: string, log: SessionLogRequest) {
  await deviceStorage.setItemAsync(key(userId), (previous) => {
    const pending = parse(previous)
    return JSON.stringify(pending.some(entry => entry.id === log.id)
      ? pending
      : [...pending, log])
  })
}

async function removeSession(userId: string, id: string) {
  await deviceStorage.setItemAsync(key(userId), previous => JSON.stringify(parse(previous).filter(log => log.id !== id)))
}

/**
 * What to do with a log after a failed send: keep it for later (no network,
 * server trouble, an expired session) or drop it (the server rejected it,
 * so resending would fail forever and block the logs behind it).
 */
function onFailure(error: unknown): "retry" | "drop" {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 429) {
    return "drop"
  }
  return "retry"
}

const flushing = new Map<string, Promise<number>>()

/**
 * Sends the user's pending logs in order and returns how many were sent.
 * Stops at the first log that should be retried. Concurrent calls share one
 * run, so a log is never sent twice at once.
 */
async function flushSessions(userId: string, send: (log: SessionLogRequest) => Promise<unknown>): Promise<number> {
  const running = flushing.get(userId)
  if (running !== undefined) {
    return running
  }
  const run = (async () => {
    let sent = 0
    for (const log of await pendingSessions(userId)) {
      try {
        await send(log)
        sent += 1
      }
      catch (error) {
        if (onFailure(error) === "retry") {
          break
        }
        console.warn(`Dropped session log ${log.id}: the server rejected it.`)
      }
      await removeSession(userId, log.id)
    }
    return sent
  })()
  flushing.set(userId, run)
  try {
    return await run
  }
  finally {
    flushing.delete(userId)
  }
}

export {
  enqueueSession,
  flushSessions,
  pendingSessions,
}
