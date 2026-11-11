import { fireEvent, screen } from "@testing-library/react-native"
import { renderRouter } from "expo-router/testing-library"

import AppLayout from "@/app/(app)/_layout"
import Today from "@/app/(app)/(tabs)/index"
import Paywall from "@/app/(app)/paywall"
import CheckIn from "@/app/(app)/check-in"
import Session from "@/app/(app)/session/[id]"
import BodyMap from "@/app/(app)/assessment/body-map"
import Result from "@/app/(app)/assessment/result"
import Question from "@/app/(app)/assessment/question/[id]"
import AssessmentLayout from "@/app/(app)/assessment/_layout"

/*
 * The signed-in route tree, minus the native tab bar (a native view jest
 * can't render). Checks that each modal flow opens from Today and that its
 * exit buttons close it again.
 */
const routes = {
  "(app)/_layout": AppLayout,
  "(app)/(tabs)/index": Today,
  "(app)/assessment/_layout": AssessmentLayout,
  "(app)/assessment/body-map": BodyMap,
  "(app)/assessment/question/[id]": Question,
  "(app)/assessment/result": Result,
  "(app)/session/[id]": Session,
  "(app)/check-in": CheckIn,
  "(app)/paywall": Paywall,
}

async function press(name: string) {
  await fireEvent.press(screen.getByRole("button", { name }))
}

describe("signed-in routes", () => {
  it("walks the assessment and closes it from the result", async () => {
    await renderRouter(routes, { initialUrl: "/" })

    await press("Start assessment")
    expect(screen).toHavePathname("/assessment/body-map")

    await press("Continue")
    expect(screen).toHavePathname("/assessment/question/q1")

    await press("See result")
    expect(screen).toHavePathname("/assessment/result")

    await press("Done")
    expect(screen).toHavePathname("/")
  })

  it("closes the assessment from the body map", async () => {
    await renderRouter(routes, { initialUrl: "/" })

    await press("Start assessment")
    await press("Close")

    expect(screen).toHavePathname("/")
  })

  it.each([
    ["Start session", "/session/demo", "Close"],
    ["Weekly check-in", "/check-in", "Submit"],
    ["Paywall", "/paywall", "Not now"],
  ])("opens %s at %s and closes it with %s", async (open, pathname, close) => {
    await renderRouter(routes, { initialUrl: "/" })

    await press(open)
    expect(screen).toHavePathname(pathname)

    await press(close)
    expect(screen).toHavePathname("/")
  })
})
