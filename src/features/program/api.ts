import type { ProgramSummary, SessionLogRequest } from "@/lib/contracts/program"

import { useCallback, useEffect } from "react"
import { AppState } from "react-native"

import { useAuth } from "@clerk/expo"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useApi } from "@/lib/api"
import { currentContentSchema } from "@/lib/contracts/assessment"
import { programResponseSchema, sessionLoggedSchema } from "@/lib/contracts/program"
import { enqueueSession, flushSessions, pendingSessions } from "@/features/sessions/outbox"

/*
 * Program data for Today, Program, and the session player. Queries marked
 * `persist` are saved on the device, so these screens work offline.
 */

const SYNC_INTERVAL_MS = 30_000

function programKey(userId: string | null | undefined) {
  return ["program", userId ?? "signed-out"] as const
}

function outboxKey(userId: string | null | undefined) {
  return ["outbox", userId ?? "signed-out"] as const
}

/** Adds sessions still waiting in the outbox to the program's progress. */
function withPending(program: ProgramSummary, pending: ReadonlyArray<SessionLogRequest>): ProgramSummary {
  const mine = pending.filter(log => log.programId === program.id)
  if (mine.length === 0) {
    return program
  }
  return {
    ...program,
    progress: {
      completedInPhase: program.progress.completedInPhase + mine.filter(log => log.phaseId === program.currentPhase).length,
      recentDates: [
        ...mine.map(log => log.scheduledDate),
        ...program.progress.recentDates,
      ].sort().reverse(),
    },
  }
}

/** The user's most recent program, including sessions not yet synced. */
function useProgram() {
  const { isSignedIn, userId } = useAuth()
  const api = useApi()
  const pending = useQuery({
    queryKey: outboxKey(userId),
    queryFn: async () => (userId === null || userId === undefined)
      ? []
      : pendingSessions(userId),
    enabled: isSignedIn === true,
    staleTime: Infinity,
  })
  const program = useQuery({
    queryKey: programKey(userId),
    queryFn: async () => (await api({ path: "/api/program", schema: programResponseSchema })).program,
    enabled: isSignedIn === true,
    meta: { persist: true },
  })

  const data = program.data === undefined || program.data === null
    ? program.data
    : withPending(program.data, pending.data ?? [])
  return { ...program, data }
}

/** A content version by ID. Published versions never change, so it's cached for good. */
function useContentVersion(contentVersionId: string | undefined) {
  const api = useApi()

  return useQuery({
    queryKey: ["content-version", contentVersionId],
    queryFn: async () => api({ path: `/api/content/${contentVersionId ?? ""}`, schema: currentContentSchema }),
    enabled: contentVersionId !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { persist: true },
  })
}

/** Sends pending session logs, then refreshes the program from the server. */
function useSyncSessions() {
  const { userId } = useAuth()
  const api = useApi()
  const queryClient = useQueryClient()

  return useCallback(async () => {
    if (userId === null || userId === undefined) {
      return
    }
    const sent = await flushSessions(userId, async log => api({
      path: "/api/sessions",
      method: "POST",
      body: log,
      schema: sessionLoggedSchema,
    }))
    await queryClient.invalidateQueries({
      queryKey: outboxKey(userId),
    })
    if (sent > 0) {
      await queryClient.invalidateQueries({
        queryKey: programKey(userId),
      })
    }
  }, [api, queryClient, userId])
}

/** Saves a completed session to the outbox (works offline), then tries to send it. */
function useLogSession() {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const sync = useSyncSessions()

  return async (log: SessionLogRequest) => {
    if (userId === null || userId === undefined) {
      throw new Error("Not signed in.")
    }
    await enqueueSession(userId, log)
    await queryClient.invalidateQueries({
      queryKey: outboxKey(userId),
    })
    void sync().catch(() => undefined)
  }
}

/**
 * Keeps the outbox draining while signed in: at start, whenever the app
 * comes to the foreground, and every 30 seconds while it's open.
 */
function useSessionSync() {
  const { isSignedIn } = useAuth()
  const sync = useSyncSessions()

  useEffect(() => {
    if (isSignedIn !== true) {
      return
    }
    const run = () => {
      void sync().catch(() => undefined)
    }
    run()
    const interval = setInterval(run, SYNC_INTERVAL_MS)
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        run()
      }
    })
    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [isSignedIn, sync])
}

export {
  programKey,
  useContentVersion,
  useLogSession,
  useProgram,
  useSessionSync,
  withPending,
}
