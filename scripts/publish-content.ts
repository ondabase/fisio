import process from "node:process"
import { mkdir, writeFile } from "node:fs/promises"

import { and, eq } from "drizzle-orm"

import { contentPacks } from "@/clinical/content"
import { bundleSchema } from "@/clinical/schema/bundle"
import { contentVersions } from "@/server/db/schema"
import { reviewDoc } from "@/clinical/publish/review-doc"
import { bundleChecksum, fail, scriptDb } from "./content"
import { runVignettes, vignetteFileSchema } from "@/clinical/vignettes/vignette"

/*
 * Publishes a content pack as an immutable draft version:
 * 1. Validates the bundle (shape and integrity).
 * 2. Runs every vignette; any failure blocks publishing.
 * 3. Computes the checksum of the canonical bundle.
 * 4. Inserts a `draft` row in content_versions (skipped with --dry-run).
 * 5. Writes the review doc for the PT to content-reviews/.
 *
 * Usage: npm run content:publish -- <content-id> [--dry-run]
 */

async function main() {
  const args = process.argv.slice(2)
  const contentId = args.find(arg => !arg.startsWith("--")) ?? "lbp"
  const dryRun = args.includes("--dry-run")

  const pack = contentPacks[contentId]
  if (pack === undefined) {
    fail(`Unknown content "${contentId}". Known: ${Object.keys(contentPacks).join(", ")}.`)
  }

  const parsed = bundleSchema.safeParse(pack.content)
  if (!parsed.success) {
    fail(`Content "${contentId}" is invalid:\n${parsed.error.issues.map(issue => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n")}`)
  }
  const bundle = parsed.data

  const vignetteFile = vignetteFileSchema.safeParse(pack.vignettes)
  if (!vignetteFile.success) {
    fail(`Vignettes for "${contentId}" are invalid:\n${vignetteFile.error.issues.map(issue => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n")}`)
  }
  const results = runVignettes(bundle, vignetteFile.data)
  const failed = results.filter(result => !result.passed)
  console.log(`Vignettes: ${results.length - failed.length} of ${results.length} passed`)
  if (failed.length > 0) {
    fail(`Vignettes failed, so ${bundle.version} can't be published:\n${failed.map(result => `  - ${result.id}: ${result.failures.join("; ")}`).join("\n")}`)
  }

  const checksum = bundleChecksum(bundle)
  console.log(`Bundle ${bundle.id} ${bundle.version}, checksum ${checksum}`)

  if (dryRun) {
    console.log("Dry run: not writing to the database.")
  }
  else {
    const db = scriptDb()
    const existing = await db.query.contentVersions.findFirst({
      where: and(eq(contentVersions.contentId, bundle.id), eq(contentVersions.version, bundle.version)),
    })
    if (existing !== undefined && existing.checksum !== checksum) {
      fail(`${bundle.id} ${bundle.version} is already published with different content. Published versions never change: bump the version.`)
    }
    if (existing === undefined) {
      await db.insert(contentVersions).values({
        contentId: bundle.id,
        version: bundle.version,
        bundle,
        checksum,
      })
      console.log(`Published ${bundle.id} ${bundle.version} as a draft.`)
    }
    else {
      console.log(`${bundle.id} ${bundle.version} is already published with this content (${existing.status}).`)
    }
  }

  const path = `content-reviews/${bundle.id}-${bundle.version}.md`
  await mkdir("content-reviews", { recursive: true })
  await writeFile(path, reviewDoc({
    bundle,
    checksum,
    vignettes: results,
    generatedAt: new Date().toISOString().slice(0, 10),
  }))
  console.log(`Review doc: ${path}`)
}

main().catch((error: unknown) => {
  fail(error instanceof Error
    ? error.message
    : String(error))
})
