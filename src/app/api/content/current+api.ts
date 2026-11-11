import { withUser } from "@/server/auth"
import { errorResponse } from "@/server/http"
import { bundleOf, currentVersion } from "@/server/content"

/**
 * The content version the app should run: the newest approved one (or
 * draft, in development). `?content=` names the pack; `lbp` by default.
 */
export const GET = withUser(async ({ request, db }) => {
  const contentId = new URL(request.url).searchParams.get("content") ?? "lbp"
  const version = await currentVersion(db, contentId)
  if (version === undefined) {
    return errorResponse(404, "not_found", "No content is available yet.")
  }
  return Response.json({
    contentVersionId: version.id,
    version: version.version,
    checksum: version.checksum,
    draft: version.status !== "approved",
    bundle: bundleOf(version),
  })
})
