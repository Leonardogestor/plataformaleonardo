/**
 * BLINDAGEM - Loading States e Skeletons
 * Componentes para mostrar estados de carregamento
 */

import { cn } from "@/lib/utils"
import { useState, useCallback } from "react"

// Skeleton para texto
export function TextSkeleton({ className, lines = 1 }: { className?: string; lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("h-4 bg-muted rounded animate-pulse", i === lines - 1 && "w-3/4")}
        />
      ))}
    </div>
  )
}

// Skeleton para cards
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 space-y-4", className)}>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-muted rounded w-full animate-pulse" />
      </div>
    </div>
  )
}

// Skeleton para tabelas
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={cn("h-4 bg-muted rounded animate-pulse", colIndex === 0 && "w-3/4")}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Skeleton para gráficos
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
      <div className="h-64 bg-muted rounded animate-pulse" />
      <div className="flex justify-between space-x-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <div className="h-4 bg-muted rounded w-8 animate-pulse mx-auto" />
            <div className="h-3 bg-muted rounded w-12 animate-pulse mx-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Skeleton para formulários
export function FormSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
        </div>
      ))}
      <div className="h-10 bg-muted rounded animate-pulse w-full" />
    </div>
  )
}

// Skeleton para listas
export function ListSkeleton({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded">
          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
          </div>
          <div className="h-6 bg-muted rounded w-16 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// Skeleton para dashboard
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton />
        <ListSkeleton items={3} />
      </div>
    </div>
  )
}

// Componente de loading spinner
export function LoadingSpinner({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-muted border-t-primary",
          sizeClasses[size]
        )}
      />
    </div>
  )
}

// Componente de loading overlay
export function LoadingOverlay({
  isLoading,
  children,
}: {
  isLoading: boolean
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-50">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  )
}

// Componente de loading para botões
export function ButtonLoading({
  isLoading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading: boolean }) {
  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        props.className
      )}
    >
      {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  )
}

// Hook para loading states
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = useState(initialState)

  const startLoading = useCallback(() => {
    setIsLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  const toggleLoading = useCallback(() => {
    setIsLoading((prev) => !prev)
  }, [])

  return {
    isLoading,
    setIsLoading,
    startLoading,
    stopLoading,
    toggleLoading,
  }
}

// Componente de erro com retry
export function ErrorWithRetry({
  error,
  onRetry,
  className,
}: {
  error: string
  onRetry: () => void
  className?: string
}) {
  return (
    <div className={cn("text-center p-6 space-y-4", className)}>
      <div className="text-red-500">
        <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-medium text-foreground">Ocorreu um erro</h3>
        <p className="text-muted-foreground mt-1">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        Tentar novamente
      </button>
    </div>
  )
}

// Componente de estado vazio
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("text-center p-6 space-y-4", className)}>
      <div className="text-muted-foreground">
        <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      {action}
    </div>
  )
}
