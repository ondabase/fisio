import type { z } from "zod"

import { useCallback } from "react"

import { useAuth } from "@clerk/expo"

/**
 * A failed API request. `status` is the HTTP status (0 for a network
 * failure) and `code` the API's error code, such as `"unauthorized"`.
 */
class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

type ApiPath = `/api/${string}`

type ApiRequest<T> = {
  path: ApiPath
  /** Validates the response body, so callers get typed, checked data. */
  schema: z.ZodType<T>
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  /** Sent as JSON. */
  body?: unknown
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json()
    if (typeof body === "object" && body !== null && "error" in body) {
      const { error } = body as { error: { code?: unknown, message?: unknown } }
      if (typeof error.code === "string" && typeof error.message === "string") {
        return new ApiError(response.status, error.code, error.message)
      }
    }
  }
  catch {
    // Not JSON: fall through to a generic error.
  }
  return new ApiError(response.status, "unknown", `Request failed with status ${response.status}.`)
}

/**
 * Returns a function that calls the app's API with the signed-in user's
 * Clerk session token. Paths are relative: in development they go to the
 * dev server; in production to the `origin` set for expo-router.
 */
function useApi() {
  const { getToken } = useAuth()

  return useCallback(async <T>({ path, schema, method = "GET", body }: ApiRequest<T>): Promise<T> => {
    const token = await getToken()
    if (token === null) {
      throw new ApiError(401, "unauthorized", "Sign in to continue.")
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json"
    }

    let response: Response
    try {
      response = await fetch(path, {
        method,
        headers,
        ...(body !== undefined && {
          body: JSON.stringify(body),
        }),
      })
    }
    catch {
      throw new ApiError(0, "network", "Couldn't reach Fisio. Check your connection and try again.")
    }

    if (!response.ok) {
      throw await readError(response)
    }
    return schema.parse(await response.json())
  }, [getToken])
}

export {
  ApiError,
  type ApiPath,
  type ApiRequest,
  useApi,
}
