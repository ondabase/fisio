import { cn } from "@/lib/utils"

describe("cn", () => {
  it("joins classes and drops falsy values", () => {
    expect(cn("px-4", false, undefined, "py-2")).toBe("px-4 py-2")
  })

  it("lets a later class override a conflicting earlier one", () => {
    expect(cn("bg-primary px-4", "bg-secondary")).toBe("px-4 bg-secondary")
  })
})
