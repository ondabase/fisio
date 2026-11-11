import { fireEvent, render, screen } from "@testing-library/react-native"

import { Button, ButtonText } from "@/components/ui/button"

describe("Button", () => {
  it("uses a string child as its accessible name and calls onPress", async () => {
    const onPress = jest.fn()
    await render(<Button onPress={onPress}>Start session</Button>)

    await fireEvent.press(screen.getByRole("button", { name: "Start session" }))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("is busy, disabled, and still labeled while loading", async () => {
    const onPress = jest.fn()
    await render(<Button loading onPress={onPress}>Save</Button>)

    const button = screen.getByRole("button", { name: "Save" })
    expect(button).toBeDisabled()
    expect(button).toBeBusy()

    await fireEvent.press(button)
    expect(onPress).not.toHaveBeenCalled()
  })

  it("throws when ButtonText is rendered outside a Button", async () => {
    // React logs the thrown render error; keep the test output clean.
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)

    await expect(render(<ButtonText>Orphan</ButtonText>)).rejects.toThrow("<ButtonText> must be rendered inside <Button>.")

    consoleError.mockRestore()
  })
})
