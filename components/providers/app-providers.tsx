"use client"

import { SessionProvider } from "@/components/session-provider"
import { TooltipProvider } from "@/components/tooltip-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SessionProvider>
      <TooltipProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </SessionProvider>
  )
}
