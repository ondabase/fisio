import type { ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/** A render wrapper with a fresh React Query client and no retries. Tests only. */
function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

export { createQueryWrapper }
