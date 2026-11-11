import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import { getServerEnv } from "@/server/env"
import * as schema from "@/server/db/schema"

/*
 * Neon's HTTP driver: one fetch per query, which suits the Workers runtime
 * on EAS Hosting. It has no interactive transactions; group writes that must
 * succeed together with `db.batch([...])`, which runs them in one transaction.
 */
function createDb() {
  return drizzle({
    client: neon(getServerEnv().DATABASE_URL),
    schema,
  })
}

type Db = ReturnType<typeof createDb>

let cached: Db | undefined

function getDb(): Db {
  cached ??= createDb()
  return cached
}

export {
  type Db,
  getDb,
}
