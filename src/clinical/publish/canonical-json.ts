/**
 * JSON with object keys sorted at every level, so the same content always
 * gives the same text, and so the same checksum, whatever order its keys
 * were written in.
 */
function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys)
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.keys(value).sort().map(key => [
      key,
      sortKeys((value as Record<string, unknown>)[key]),
    ]))
  }
  return value
}

export { canonicalJson }
