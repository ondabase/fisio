import type { TestInstance } from "test-renderer"

import { AccessibilityInfo } from "react-native"

import { fireEvent, render, screen } from "@testing-library/react-native"

import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { BodyMap } from "@/features/body-map/body-map"
import { figureRegions, RENDERED_HEIGHT, VIEW_BOX } from "@/features/body-map/figure"

const regions = lbpBundle.regions

/* The invisible tap targets over the drawing, in drawing order (screen left first per row). */
function tapTargets(): Array<TestInstance> {
  return screen.root?.queryAll(node => typeof node.props.testID === "string" && node.props.testID.startsWith("body-map-"), { matchDeepestOnly: true }) ?? []
}

async function renderMap(value: Array<string> = []) {
  const onChange = jest.fn()
  await render(<BodyMap regions={regions} value={value} onChange={onChange} />)
  return onChange
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe("body map figure", () => {
  it("draws every content region, and only content regions", () => {
    const drawn = new Set(Object.values(figureRegions).flat().map(region => region.regionId))

    expect([...drawn].sort()).toEqual(regions.map(region => region.id).sort())
  })

  it("gives every region a tap target of at least 44pt", () => {
    const scale = RENDERED_HEIGHT / VIEW_BOX.height
    const small = Object.values(figureRegions).flat().filter(region => region.hit.width * scale < 44 || region.hit.height * scale < 44)

    expect(small.map(region => region.regionId)).toEqual([])
  })

  it("mirrors the sides in the front view", () => {
    const back = figureRegions.back.find(region => region.regionId === "below-knee-left")
    const front = figureRegions.front.find(region => region.regionId === "below-knee-left")

    expect(back?.hit.x).toBeLessThan(100)
    expect(front?.hit.x).toBeGreaterThanOrEqual(100)
  })
})

describe("BodyMap", () => {
  it("toggles a region when its area is tapped", async () => {
    const onChange = await renderMap(["buttock-left"])

    // The back view's first target is the lower back.
    await fireEvent.press(tapTargets()[0] as TestInstance)

    expect(onChange).toHaveBeenCalledWith(["buttock-left", "lower-back"])
  })

  it("deselects a selected region", async () => {
    const onChange = await renderMap(["lower-back"])

    await fireEvent.press(tapTargets()[0] as TestInstance)

    expect(onChange).toHaveBeenCalledWith([])
  })

  it("maps the screen-left leg to the user's right leg in the front view", async () => {
    const onChange = await renderMap()

    await fireEvent.press(screen.getByRole("radio", { name: "Front" }))
    await fireEvent.press(tapTargets()[0] as TestInstance)

    expect(onChange).toHaveBeenCalledWith(["below-knee-right"])
  })

  it("lists the selection in words", async () => {
    await renderMap(["lower-back", "below-knee-left"])

    expect(screen.getByText("Selected: Lower back, Left leg below the knee")).toBeOnTheScreen()
  })

  it("offers a checklist instead of the drawing", async () => {
    const onChange = await renderMap(["lower-back"])

    await fireEvent.press(screen.getByRole("button", { name: "Choose from a list instead" }))

    expect(screen.getByRole("checkbox", { name: "Lower back" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Left buttock" })).not.toBeChecked()
    await fireEvent.press(screen.getByRole("checkbox", { name: "Left buttock" }))
    expect(onChange).toHaveBeenCalledWith(["lower-back", "buttock-left"])
  })

  it("shows the checklist to screen reader users", async () => {
    jest.spyOn(AccessibilityInfo, "isScreenReaderEnabled").mockResolvedValue(true)

    await renderMap()

    expect(await screen.findByRole("checkbox", { name: "Lower back" })).toBeOnTheScreen()
    expect(screen.queryByRole("button", { name: "Choose from a list instead" })).not.toBeOnTheScreen()
    expect(tapTargets()).toHaveLength(0)
  })
})
