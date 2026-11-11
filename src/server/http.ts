import type { z } from "zod"

/*
 * JSON helpers for API routes. Error bodies are `{ error: { code, message } }`
 * with a stable `code` the app can switch on. Messages never echo request
 * content, so no health data ends up in responses or logs.
 */

type ErrorCode = "unauthorized" | "invalid_request" | "conflict" | "internal"

function errorResponse(status: number, code: ErrorCode, message: string) {
  return Response.json({
    error: { code, message },
  }, { status })
}

function fieldPath(path: ReadonlyArray<PropertyKey>) {
  return path.length > 0
    ? path.map(String).join(".")
    : "(root)"
}

type ParseResult<T> = { ok: true, data: T } | { ok: false, response: Response }

/** Parses a JSON body against a schema, or returns a 400 response. */
async function parseJsonBody<T extends z.ZodType>(request: Request, schema: T): Promise<ParseResult<z.infer<T>>> {
  let body: unknown
  try {
    body = await request.json()
  }
  catch {
    return {
      ok: false,
      response: errorResponse(400, "invalid_request", "Body must be JSON."),
    }
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    // Field paths only: the values may be health data.
    const fields = result.error.issues.map(issue => fieldPath(issue.path)).join(", ")
    return {
      ok: false,
      response: errorResponse(400, "invalid_request", `Invalid fields: ${fields}.`),
    }
  }
  return { ok: true, data: result.data }
}

export {
  type ErrorCode,
  errorResponse,
  parseJsonBody,
  type ParseResult,
}
