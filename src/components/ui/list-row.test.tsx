import { fireEvent, render, screen } from "@testing-library/react-native"

import { ListGroup, ListRow } from "@/components/ui/list-row"

describe("ListRow", () => {
  it("is a button when it has onPress", async () => {
    const onPress = jest.fn()
    await render(<ListRow title="Reminders" description="Daily at 8 AM" onPress={onPress} />)

    await fireEvent.press(screen.getByRole("button"))

    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it("is static without onPress", async () => {
    await render(<ListRow title="Length" value="4 weeks" />)

    expect(screen.queryByRole("button")).not.toBeOnTheScreen()
    expect(screen.getByText("4 weeks")).toBeOnTheScreen()
  })

  it("ignores presses while disabled", async () => {
    const onPress = jest.fn()
    await render(<ListRow title="Export data" onPress={onPress} disabled />)

    const row = screen.getByRole("button")
    expect(row).toBeDisabled()

    await fireEvent.press(row)
    expect(onPress).not.toHaveBeenCalled()
  })

  it("renders every row inside a ListGroup", async () => {
    await render(
      <ListGroup>
        <ListRow title="My account" onPress={jest.fn()} />
        <ListRow title="Reminders" onPress={jest.fn()} />
      </ListGroup>,
    )

    expect(screen.getAllByRole("button")).toHaveLength(2)
  })
})
