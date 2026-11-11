import type { Bundle } from "@/clinical/schema/bundle"

import process from "node:process"
import { createHash } from "node:crypto"

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "@/server/db/schema"
import { canonicalJson } from "@/clinical/publish/canonical-json"

/* Shared helpers for the content scripts. These run in Node, never in the app. */

/** SHA-256 of the bundle's canonical JSON: the identity a PT signs. */
function bundleChecksum(bundle: Bundle) {
  return createHash("sha256").update(canonicalJson(bundle)).digest("hex")
}

/** A database client from DATABASE_URL (loaded from `.env` by the npm script). */
function scriptDb() {
  const url = process.env.DATABASE_URL
  if (url === undefined || url === "") {
    fail("Missing DATABASE_URL. Add it to .env (see .env.example).")
  }
  return drizzle({
    client: neon(url),
    schema,
  })
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

/** The value after `--name` in the arguments, or undefined. */
function option(args: Array<string>, name: string) {
  const index = args.indexOf(`--${name}`)
  return index === -1
    ? undefined
    : args[index + 1]
}

export {
  bundleChecksum,
  fail,
  option,
  scriptDb,
}
