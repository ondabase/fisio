import { withUser } from "@/server/auth"
import { toMe } from "@/server/users"

/** The signed-in user. Creates their record on first call. */
export const GET = withUser(async ({ user }) => {
  return Response.json(toMe(user))
})
