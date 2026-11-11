import { render, screen } from "@testing-library/react-native"

import { Text } from "@/components/ui/text"

describe("Text", () => {
  it.each(["display", "title", "heading"] as const)("announces the %s style as a heading", async (variant) => {
    await render(<Text variant={variant}>Your program</Text>)

    expect(screen.getByRole("heading", { name: "Your program" })).toBeOnTheScreen()
  })

  it("leaves body text without a role", async () => {
    await render(<Text>Pain level</Text>)

    expect(screen.queryByRole("heading")).not.toBeOnTheScreen()
  })

  it("lets an explicit role override the default", async () => {
    await render(<Text variant="title" role="none">Decorative</Text>)

    expect(screen.queryByRole("heading")).not.toBeOnTheScreen()
  })
})
