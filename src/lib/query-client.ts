import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api"

const MAX_RETRIES = 2

/*
 * Client errors (4xx) won't succeed on retry, so only network and server
 * errors are retried.
 */
function shouldRetry(failureCount: number, error: Error) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false
  }
  return failureCount < MAX_RETRIES
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export { createQueryClient }
