"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode } from "react"

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Query keys for consistency
export const queryKeys = {
  financialData: ["financialData"],
  transactions: ["transactions"],
  incomeSources: ["incomeSources"],
  strategy: ["strategy"],
  investments: ["investments"],
  profile: ["profile"],
  trustMetrics: ["trustMetrics"],
}
