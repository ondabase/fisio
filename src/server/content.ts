import type { Db } from "@/server/db/client"
import type { Bundle } from "@/clinical/schema/bundle"
import type { ContentVersion } from "@/server/db/schema"

import { and, desc, eq, inArray } from "drizzle-orm"

import { getServerEnv } from "@/server/env"
import { bundleSchema } from "@/clinical/schema/bundle"
import { contentVersions } from "@/server/db/schema"

/*
 * Which content versions the API serves. Production serves only
 * PT-approved versions; development (CONTENT_CHANNEL=draft) also serves
 * drafts, so the app can run on placeholder content.
 */

type ServableStatus = ContentVersion["status"]

function servableStatuses(): Array<ServableStatus> {
  return getServerEnv().CONTENT_CHANNEL === "draft"
    ? ["approved", "draft"]
    : ["approved"]
}

function isServable(version: ContentVersion) {
  return servableStatuses().includes(version.status)
}

/** The newest servable version of a content pack, or undefined. */
async function currentVersion(db: Db, contentId: string): Promise<ContentVersion | undefined> {
  return db.query.contentVersions.findFirst({
    where: and(eq(contentVersions.contentId, contentId), inArray(contentVersions.status, servableStatuses())),
    orderBy: desc(contentVersions.createdAt),
  })
}

async function versionById(db: Db, id: string): Promise<ContentVersion | undefined> {
  return db.query.contentVersions.findFirst({
    where: eq(contentVersions.id, id),
  })
}

/*
 * Published bundles never change, so a parsed bundle can be cached by
 * version ID for the life of the server instance.
 */
const parsedBundles = new Map<string, Bundle>()

/** The validated bundle of a stored version. */
function bundleOf(version: ContentVersion): Bundle {
  let bundle = parsedBundles.get(version.id)
  if (bundle === undefined) {
    bundle = bundleSchema.parse(version.bundle)
    parsedBundles.set(version.id, bundle)
  }
  return bundle
}

export {
  bundleOf,
  currentVersion,
  isServable,
  versionById,
}
