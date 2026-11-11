import vignettesJson from "@/clinical/vignettes/lbp.vignettes.json"

import { lbpBundle } from "@/clinical/content/lbp/bundle"
import { runVignettes, vignetteFileSchema } from "@/clinical/vignettes/vignette"

/* Golden tests: every LBP vignette must produce its expected result. */

const vignettes = vignetteFileSchema.parse(vignettesJson)

describe("LBP vignettes", () => {
  it("have unique IDs", () => {
    const ids = vignettes.map(vignette => vignette.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(runVignettes(lbpBundle, vignettes).map(result => [result.id, result] as const))("%s", (...[, result]) => {
    expect(result.failures).toEqual([])
  })

  it("reach every safety rule", () => {
    const flagged = new Set(vignettes.flatMap(vignette => vignette.expect.flags))
    const ruleIds = [
      ...lbpBundle.safetyRules,
      ...lbpBundle.checkIn.safetyRules,
    ].map(rule => rule.id)

    expect(ruleIds.filter(id => !flagged.has(id))).toEqual([])
  })

  it("reach every track and starting phase", () => {
    const starts = new Set(vignettes.flatMap(vignette => vignette.kind === "assessment" && vignette.expect.trackId !== null
      ? [`${vignette.expect.trackId}/${vignette.expect.startPhase}`]
      : []))
    const ruleStarts = lbpBundle.trackRules.map(rule => `${rule.track}/${rule.phase}`)

    expect(ruleStarts.filter(start => !starts.has(start))).toEqual([])
  })
})
