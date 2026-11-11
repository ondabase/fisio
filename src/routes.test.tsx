import type { SessionLogRequest } from "@/lib/contracts/program"

import { Alert } from "react-native"

import { fireEvent, screen } from "@testing-library/react-native"
import { renderRouter } from "expo-router/testing-library"

import AppLayout from "@/app/(app)/_layout"
import Today from "@/app/(app)/(tabs)/index"
import CheckIn from "@/app/(app)/check-in"
import Session from "@/app/(app)/session/[id]"
import { createQueryWrapper } from "@/testing/query-wrapper"

/*
 * The signed-in app around an active program: Today, the session player,
 * and the check-in placeholder, minus the native tab bar (a native view jest
 * can't render). The program API is mocked; logging a session is captured.
 */

const mockLogged: Array<SessionLogRequest> = []

jest.mock("@/features/program/api", () => {
  const { lbpBundle } = jest.requireActual<{ lbpBundle: unknown }>("@/clinical/content/lbp/bundle")
  const program = {
    id: "00000000-0000-4000-8000-000000000001",
    status: "active",
    contentVersionId: "00000000-0000-4000-8000-000000000002",
    trackId: "general",
    currentPhase: "calm",
    startedAt: "2026-11-01T10:00:00.000Z",
    progress: { completedInPhase: 0, recentDates: [] },
  }
  return {
    useSessionSync: () => undefined,
    useProgram: () => ({
      data: program,
      isError: false,
      isPending: false,
      refetch: jest.fn(),
    }),
    useContentVersion: () => ({
      data: { bundle: lbpBundle, draft: true },
      isError: false,
      isPending: false,
    }),
    useLogSession: () => async (log: SessionLogRequest) => {
      mockLogged.push(log)
    },
  }
})

const routes = {
  "(app)/_layout": AppLayout,
  "(app)/(tabs)/index": Today,
  "(app)/session/[id]": Session,
  "(app)/check-in": CheckIn,
}

async function press(name: string) {
  await fireEvent.press(screen.getByRole("button", { name }))
}

async function render() {
  await renderRouter(routes, {
    initialUrl: "/",
    wrapper: createQueryWrapper(),
  })
}

beforeEach(() => {
  mockLogged.length = 0
})

describe("today and the session player", () => {
  it("shows today's session for an active program", async () => {
    await render()

    expect(screen.getByText("Gentle mobility")).toBeOnTheScreen()
    expect(screen.getByText("DRAFT CONTENT")).toBeOnTheScreen()
  })

  it("plays a whole session and logs it", async () => {
    await render()
    await press("Start today's session")
    expect(screen).toHavePathname("/session/calm-a")

    // Pelvic tilt: 2 sets of 10.
    expect(screen.getByText("Video coming soon")).toBeOnTheScreen()
    await press("Set 1 done")
    await press("Set 2 done")
    await press("Next exercise")
    // Knee to chest: 2 sets with a 20 s hold.
    expect(screen.getByRole("timer")).toBeOnTheScreen()
    await press("Set 1 done")
    await press("Set 2 done")
    await press("Next exercise")
    // Cat-cow: skipped.
    await press("Skip this exercise")
    // Walking: 1 set of 10 minutes.
    await press("Set 1 done")
    await press("Finish exercises")

    expect(screen.getByRole("button", { name: "Finish session" })).toBeDisabled()
    await fireEvent.press(screen.getByRole("radio", { name: "3" }))
    await press("Finish session")

    expect(await screen.findByText("Session complete!")).toBeOnTheScreen()
    expect(screen.getByText("You finished 3 of 4 exercises.")).toBeOnTheScreen()
    expect(mockLogged).toHaveLength(1)
    expect(mockLogged[0]).toMatchObject({
      programId: "00000000-0000-4000-8000-000000000001",
      sessionId: "calm-a",
      phaseId: "calm",
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
    })

    await press("Back to Today")
    expect(screen).toHavePathname("/")
  })

  it("ends a session early without logging it", async () => {
    jest.spyOn(Alert, "alert").mockImplementation((...[, , buttons]) => {
      buttons?.find(button => button.text === "End session")?.onPress?.()
    })
    await render()
    await press("Start today's session")

    await press("End the session")

    expect(screen).toHavePathname("/")
    expect(mockLogged).toHaveLength(0)
  })

  it("opens the weekly check-in and closes it", async () => {
    await render()
    // The row's accessible name includes its description.
    await fireEvent.press(screen.getByRole("button", { name: /^Weekly check-in/ }))
    expect(screen).toHavePathname("/check-in")

    await press("Submit")
    expect(screen).toHavePathname("/")
  })
})
