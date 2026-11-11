import { cn } from "@/lib/utils"

describe("cn", () => {
  it("joins classes and drops falsy values", () => {
    expect(cn("px-4", false, undefined, "py-2")).toBe("px-4 py-2")
  })

  it("lets a later class override a conflicting earlier one", () => {
    expect(cn("bg-primary px-4", "bg-secondary")).toBe("px-4 bg-secondary")
  })

  it("keeps a custom type-scale size next to a text color", () => {
    expect(cn("text-body text-muted-foreground")).toBe("text-body text-muted-foreground")
  })

  it("treats custom sizes, spacing, and radii as their own groups", () => {
    expect(cn("text-body", "text-caption")).toBe("text-caption")
    expect(cn("px-4", "px-screen")).toBe("px-screen")
    expect(cn("rounded-xl", "rounded-card")).toBe("rounded-card")
  })
})
