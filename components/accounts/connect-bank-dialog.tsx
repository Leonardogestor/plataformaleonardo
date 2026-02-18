"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, RefreshCw, Trash2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BankConnection {
  id: string
  provider: string
  status: string
  error: string | null
  lastSyncAt: string | null
  accounts: {
    id: string
    name: string
    institution: string
    balance: number
  }[]
}

export function ConnectBankDialog() {
  const [open, setOpen] = useState(false)
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setSyncing] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      fetchConnections()
    }
  }, [open])

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/open-finance/connections")
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error("Error fetching connections:", error)
    }
  }

  const handleConnectBank = async () => {
    setIsLoading(true)

    try {
      // 1. Criar Connect Token (Pluggy pode demorar na primeira chamada)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 35000)
      const response = await fetch("/api/open-finance/connect", {
        method: "POST",
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error("Falha ao obter link de conexão. Tente novamente em instantes.")
      }

      const { accessToken } = await response.json()

      // 2. Abrir Pluggy Connect Widget
      // @ts-ignore - Pluggy SDK é carregado via CDN
      if (typeof window.PluggyConnect === "undefined") {
        await loadPluggySDK()
      }

      // @ts-ignore
      const pluggyConnect = new window.PluggyConnect({
        connectToken: accessToken,
        includeSandbox: process.env.NODE_ENV === "development",
        onSuccess: async (itemData: { item: { id: string } }) => {
          console.log("Bank connected:", itemData)

          await fetch("/api/open-finance/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId: itemData.item.id }),
          })

          toast({
            title: "Banco conectado!",
            description: "Suas transações estão sendo sincronizadas.",
          })

          fetchConnections()
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("open-finance:connected"))
          }
        },
        onError: (error: { message: string }) => {
          console.error("Pluggy error:", error)
          toast({
            title: "Erro ao conectar",
            description: error.message || "Tente novamente mais tarde.",
            variant: "destructive",
          })
        },
        onClose: () => {
          console.log("Widget closed")
        },
      })

      if (typeof pluggyConnect.init === "function") {
        pluggyConnect.init()
      } else if (typeof pluggyConnect.open === "function") {
        pluggyConnect.open()
      } else {
        throw new Error("Não foi possível abrir a tela de conexão. Recarregue a página e tente novamente.")
      }
    } catch (error: unknown) {
      console.error("Error connecting bank:", error)
      const message =
        error instanceof Error
          ? error.name === "AbortError"
            ? "A conexão demorou demais. Tente novamente."
            : error.message
          : "Não foi possível conectar o banco. Tente novamente."
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId)

    try {
      const response = await fetch("/api/open-finance/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      })

      if (response.ok) {
        toast({
          title: "Sincronização iniciada",
          description: "Seus dados serão atualizados em breve.",
        })

        // Atualizar lista após 2 segundos
        setTimeout(fetchConnections, 2000)
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setSyncing(null)
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm("Deseja realmente desconectar este banco?")) return

    try {
      const response = await fetch(`/api/open-finance/connections/${connectionId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Banco desconectado",
          description: "A conexão foi removida com sucesso.",
        })
        fetchConnections()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível desconectar o banco.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Building2 className="mr-2 h-4 w-4" />
          Conectar Banco
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Conectar Banco</DialogTitle>
          <DialogDescription>
            Conecte suas contas bancárias de forma segura. Suas transações serão sincronizadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {connections.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Suas conexões</h3>
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">
                        {connection.accounts[0]?.institution || "Banco"}
                      </h4>
                      <ConnectionStatusBadge status={connection.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connection.accounts.length} conta(s) conectada(s)
                    </p>
                    {connection.error && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {connection.error}
                      </p>
                    )}
                    {connection.lastSyncAt && (
                      <p className="text-xs text-muted-foreground">
                        Última sincronização:{" "}
                        {new Date(connection.lastSyncAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSync(connection.id)}
                      disabled={isSyncing === connection.id || connection.status === "LOGIN_ERROR"}
                    >
                      {isSyncing === connection.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(connection.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {connections.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>Nenhum banco conectado ainda.</p>
              <p className="text-sm mb-4">Conecte sua conta para sincronizar transações automaticamente.</p>
            </div>
          )}

          <Button onClick={handleConnectBank} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : connections.length > 0 ? (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Conectar outro banco
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Conectar conta bancária
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConnectionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: any; icon: any; label: string }> = {
    ACTIVE: {
      variant: "default",
      icon: CheckCircle2,
      label: "Conectado",
    },
    UPDATING: {
      variant: "secondary",
      icon: RefreshCw,
      label: "Sincronizando",
    },
    LOGIN_ERROR: {
      variant: "destructive",
      icon: AlertCircle,
      label: "Erro",
    },
    OUTDATED: {
      variant: "secondary",
      icon: AlertCircle,
      label: "Desatualizado",
    },
    DISCONNECTED: {
      variant: "outline",
      icon: AlertCircle,
      label: "Desconectado",
    },
  } as const

  const config = variants[status] ?? variants.DISCONNECTED
  if (!config) return null
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1">
      {Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}

const PLUGGY_LOAD_TIMEOUT_MS = 12_000

function loadPluggySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as any).PluggyConnect) {
      resolve()
      return
    }

    const existing = document.getElementById("pluggy-connect-sdk")
    if (existing) {
      if ((window as any).PluggyConnect) {
        resolve()
        return
      }
      existing.remove()
    }

    const script = document.createElement("script")
    script.id = "pluggy-connect-sdk"
    script.src = "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js"
    script.async = true
    const timeoutId = setTimeout(() => {
      if (!(window as any).PluggyConnect) {
        reject(new Error("A tela de conexão demorou para carregar. Tente novamente."))
      }
    }, PLUGGY_LOAD_TIMEOUT_MS)
    script.onload = () => {
      clearTimeout(timeoutId)
      const deadline = Date.now() + 5000
      const check = () => {
        if ((window as any).PluggyConnect) {
          resolve()
          return
        }
        if (Date.now() > deadline) {
          reject(new Error("A tela de conexão não carregou. Recarregue a página e tente novamente."))
          return
        }
        setTimeout(check, 100)
      }
      check()
    }
    script.onerror = () => {
      clearTimeout(timeoutId)
      reject(new Error("Não foi possível carregar o widget de conexão. Verifique sua conexão ou bloqueadores de anúncio."))
    }
    document.head.appendChild(script)
  })
}
