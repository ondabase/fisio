import process from "node:process"

import { and, eq } from "drizzle-orm"

import { bundleSchema } from "@/clinical/schema/bundle"
import { contentVersions } from "@/server/db/schema"
import { bundleChecksum, fail, option, scriptDb } from "./content"

/*
 * Records the PT's sign-off on a published draft. The checksum must match
 * the one on the review doc the PT signed, so an approval always refers to
 * exactly the content they read.
 *
 * Usage: npm run content:approve -- <content-id> <version> --by "<name, credentials>" --checksum <sha256>
 */

async function main() {
  const args = process.argv.slice(2)
  const [contentId, version] = args.filter((arg, index) => !arg.startsWith("--") && !args[index - 1]?.startsWith("--"))
  const approvedBy = option(args, "by")
  const signedChecksum = option(args, "checksum")

  if (contentId === undefined || version === undefined || approvedBy === undefined || signedChecksum === undefined) {
    fail("Usage: npm run content:approve -- <content-id> <version> --by \"<name, credentials>\" --checksum <sha256>")
  }
  if (version.includes("-draft")) {
    fail(`${version} is a draft version. Publish a release version (such as 1.0.0) for approval.`)
  }

  const db = scriptDb()
  const row = await db.query.contentVersions.findFirst({
    where: and(eq(contentVersions.contentId, contentId), eq(contentVersions.version, version)),
  })
  if (row === undefined) {
    fail(`${contentId} ${version} isn't published. Run npm run content:publish first.`)
  }
  if (row.status !== "draft") {
    fail(`${contentId} ${version} is already ${row.status}.`)
  }

  // Re-derive the checksum from the stored bundle, so a tampered row can't be approved.
  const stored = bundleSchema.safeParse(row.bundle)
  if (!stored.success || bundleChecksum(stored.data) !== row.checksum) {
    fail(`The stored bundle for ${contentId} ${version} doesn't match its checksum. Don't approve it; investigate.`)
  }
  if (row.checksum !== signedChecksum) {
    fail(`The signed checksum doesn't match ${contentId} ${version}. The PT must sign the review doc for exactly this version.`)
  }

  await db.update(contentVersions)
    .set({
      status: "approved",
      approvedBy,
      approvedAt: new Date(),
    })
    .where(eq(contentVersions.id, row.id))
  console.log(`Approved ${contentId} ${version} (${row.checksum}), signed by ${approvedBy}.`)
}

main().catch((error: unknown) => {
  fail(error instanceof Error
    ? error.message
    : String(error))
})
