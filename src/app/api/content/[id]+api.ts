import { withUser } from "@/server/auth"
import { errorResponse } from "@/server/http"
import { userHasVersion } from "@/server/programs"
import { bundleOf, isServable, versionById } from "@/server/content"

/**
 * A specific content version, such as the one a program is pinned to. A
 * version never changes, so the app can cache it indefinitely. Readable
 * when it's servable or one of the user's programs uses it.
 */
export const GET = withUser(async ({ params, user, db }) => {
  const id = params.id ?? ""
  const version = /^[0-9a-f-]{36}$/i.test(id)
    ? await versionById(db, id)
    : undefined
  if (version === undefined || !(isServable(version) || await userHasVersion(db, user, version.id))) {
    return errorResponse(404, "not_found", "Content not found.")
  }
  return Response.json({
    contentVersionId: version.id,
    version: version.version,
    checksum: version.checksum,
    draft: version.status !== "approved",
    bundle: bundleOf(version),
  })
})
