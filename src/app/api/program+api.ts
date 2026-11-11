import { withUser } from "@/server/auth"
import { currentProgram } from "@/server/programs"

/** The user's most recent program and their progress in it. */
export const GET = withUser(async ({ user, db }) => {
  return Response.json({ program: await currentProgram(db, user) })
})
