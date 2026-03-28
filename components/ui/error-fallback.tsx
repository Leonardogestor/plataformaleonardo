/**
 * BLINDAGEM - Componentes Fallback
 * Componentes de fallback para situações de erro e estados vazios
 */

import React from "react"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

// Fallback genérico para componentes
export const ComponentFallback = ({
  componentName = "Componente",
  onRetry,
  className,
}: {
  componentName?: string
  onRetry?: () => void
  className?: string
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-center text-muted-foreground">
          {componentName} indisponível
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar o {componentName.toLowerCase()}. Tente novamente mais tarde.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            Tentar novamente
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Fallback para dashboard
export const DashboardFallback = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="h-8 bg-muted rounded mb-2 animate-pulse"></div>
                <div className="h-6 bg-muted rounded w-3/4 mx-auto animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <ComponentFallback componentName="Dashboard" onRetry={onRetry} />
    </div>
  )
}

// Fallback para gráficos
export const ChartFallback = ({
  chartType = "Gráfico",
  onRetry,
}: {
  chartType?: string
  onRetry?: () => void
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-muted-foreground">
              <svg
                className="h-12 w-12 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p>{chartType} indisponível</p>
            </div>
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              Tentar novamente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Fallback para tabelas
export const TableFallback = ({
  tableName = "Dados",
  onRetry,
}: {
  tableName?: string
  onRetry?: () => void
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">
            <svg
              className="h-12 w-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p>Nenhum {tableName.toLowerCase()} encontrado</p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              Tentar novamente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Fallback para formulários
export const FormFallback = ({
  formName = "Formulário",
  onRetry,
}: {
  formName?: string
  onRetry?: () => void
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{formName} indisponível</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Não foi possível carregar o {formName.toLowerCase()}. Tente novamente.
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              Tentar novamente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Fallback para listas vazias
export const EmptyListFallback = ({
  itemName = "item",
  onAdd,
  icon,
}: {
  itemName?: string
  onAdd?: () => void
  icon?: React.ReactNode
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">
            {icon || (
              <svg
                className="h-12 w-12 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            )}
            <p>Nenhum {itemName.toLowerCase()} encontrado</p>
            <p className="text-sm">Comece adicionando seu primeiro {itemName.toLowerCase()}.</p>
          </div>
          {onAdd && (
            <Button onClick={onAdd} size="sm">
              Adicionar {itemName}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Fallback para erro de conexão
export const ConnectionErrorFallback = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="text-red-500">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium">Erro de conexão</h3>
            <p className="text-muted-foreground">
              Não foi possível conectar ao servidor. Verifique sua conexão com a internet.
            </p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Tentar novamente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Fallback para erro de permissão
export const PermissionErrorFallback = ({
  requiredPermission,
  onBack,
}: {
  requiredPermission?: string
  onBack?: () => void
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="text-yellow-500">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m0 0v-2m0 2h-2m2 0h2m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium">Acesso negado</h3>
            <p className="text-muted-foreground">
              {requiredPermission
                ? `Você não tem permissão para acessar esta função. Permissão necessária: ${requiredPermission}`
                : "Você não tem permissão para acessar esta função."}
            </p>
          </div>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              Voltar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Fallback para dados não encontrados
export const NotFoundFallback = ({
  itemName = "Recurso",
  onBack,
}: {
  itemName?: string
  onBack?: () => void
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.828a7.962 7.962 0 00-3-1.828A8 8 0 004.5 10a8 8 0 0011.5 6.828z"
              />
            </svg>
            <p>{itemName} não encontrado</p>
            <p className="text-sm">
              O {itemName.toLowerCase()} que você está procurando não existe ou foi removido.
            </p>
          </div>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              Voltar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// HOC para adicionar fallback a componentes
export const withFallback = <P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent: React.ComponentType<{ error?: any; onRetry?: () => void }>
) => {
  const WrappedComponent = React.memo((props: P) => {
    return (
      <React.Suspense
        fallback={React.createElement(fallbackComponent, {
          onRetry: () => window.location.reload(),
        })}
      >
        <ErrorBoundary fallbackComponent={fallbackComponent}>
          <Component {...props} />
        </ErrorBoundary>
      </React.Suspense>
    )
  })

  WrappedComponent.displayName = `withFallback(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Componente ErrorBoundary
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode
    fallbackComponent: React.ComponentType<{ error?: any; onRetry?: () => void }>
  },
  { hasError: boolean; error?: Error }
> {
  static displayName = "ErrorBoundary"

  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallbackComponent
      return React.createElement(FallbackComponent, {
        error: this.state.error,
        onRetry: () => {
          this.setState({ hasError: false, error: undefined })
        },
      })
    }

    return this.props.children
  }
}

const ErrorFallbackComponents = {
  ComponentFallback,
  DashboardFallback,
  ChartFallback,
  TableFallback,
  FormFallback,
  EmptyListFallback,
  ConnectionErrorFallback,
  PermissionErrorFallback,
  NotFoundFallback,
  withFallback,
  ErrorBoundary,
}

export default ErrorFallbackComponents
