import type { Bundle } from "@/clinical/schema/bundle"

import { bundleSchema } from "@/clinical/schema/bundle"
import { lbpContent } from "@/clinical/content/lbp/content"

/** The LBP bundle, validated at load. Import this to run the engine. */
const lbpBundle: Bundle = bundleSchema.parse(lbpContent)

export { lbpBundle }
