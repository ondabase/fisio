import type { BundleInput } from "@/clinical/schema/bundle"

import lbpVignettes from "@/clinical/vignettes/lbp.vignettes.json"

import { lbpContent } from "@/clinical/content/lbp/content"

/*
 * Every content pack the publish script knows about: the authored content,
 * unvalidated, and its vignettes. The publish script validates both, so a
 * broken pack is reported rather than crashing on import.
 */
type ContentPack = {
  content: BundleInput
  vignettes: unknown
}

const contentPacks: Record<string, ContentPack> = {
  lbp: { content: lbpContent, vignettes: lbpVignettes },
}

export {
  type ContentPack,
  contentPacks,
}
