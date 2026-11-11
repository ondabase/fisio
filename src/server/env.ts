import { z } from "zod"

/*
 * Server-only environment. API routes can read every variable, not just
 * `EXPO_PUBLIC_*` ones. Locally `expo start` loads `.env`; on EAS Hosting
 * they come from the EAS environment.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  CLERK_SECRET_KEY: z.string().startsWith("sk_"),
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
})

type ServerEnv = z.infer<typeof serverEnvSchema>

let cached: ServerEnv | undefined

/**
 * Parsed on first use rather than at import, so a missing variable fails the
 * request that needs it with a clear message instead of crashing the bundle.
 */
function getServerEnv(): ServerEnv {
  if (cached === undefined) {
    // The one place server code reads the environment.
    // eslint-disable-next-line no-restricted-globals, node/prefer-global/process
    const result = serverEnvSchema.safeParse(process.env)
    if (!result.success) {
      const names = result.error.issues.map(issue => issue.path.join(".")).join(", ")
      throw new Error(`Invalid server environment: ${names}. See .env.example.`)
    }
    cached = result.data
  }
  return cached
}

export {
  getServerEnv,
  type ServerEnv,
}
