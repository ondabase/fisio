import type { Query } from "@tanstack/react-query"

import { QueryClient } from "@tanstack/react-query"
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister"

import { ApiError } from "@/lib/api"
import { deviceStorage } from "@/lib/device-storage"

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

/*
 * The query cache is saved on the device so the app works offline. Only
 * queries marked `meta: { persist: true }` are saved, and only once they've
 * loaded. Saved data older than a week is discarded.
 */
const queryPersister = createAsyncStoragePersister({ storage: deviceStorage, key: "query-cache" })

const persistOptions = {
  persister: queryPersister,
  maxAge: 7 * 24 * 60 * 60_000,
  // Bump to discard saved caches after a breaking change to cached shapes.
  buster: "1",
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === "success" && query.meta?.persist === true,
  },
}

export {
  createQueryClient,
  persistOptions,
  queryPersister,
}
