"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import TransactionsTable from "@/components/transactions/transactions-table"
import { TransactionFilters } from "@/components/transactions/transaction-filters"
import { Button } from "@/components/ui/button"
import { Plus, Upload, Receipt, Trash2, CheckSquare, Square, Edit, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TransactionsSkeleton } from "@/components/ui/loading-skeletons"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import dynamic from "next/dynamic"
import { Transaction } from "@prisma/client"
import { TransactionWithRelations } from "@/types/transaction"
import { PdfStagingUpload } from "@/components/documents/pdf-staging-upload"

// Lazy load do TransactionDialog para melhorar performance
const TransactionDialog = dynamic(
  () =>
    import("@/components/transactions/transaction-dialog").then((mod) => ({
      default: mod.TransactionDialog,
    })),
  { ssr: false }
)

// Lazy load do BulkEditCategoryDialog
const BulkEditCategoryDialog = dynamic(
  () =>
    import("@/components/transactions/bulk-edit-category-dialog").then((mod) => ({
      default: mod.BulkEditCategoryDialog,
    })),
  { ssr: false }
)

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function TransactionsPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithRelations | null>(
    null
  )
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    subcategory: "",
    paymentMethod: "",
    competenceMonth: "",
    status: "",
    accountId: "",
    type: "",
    startDate: "",
    endDate: "",
  })
  const { toast } = useToast()
  const router = useRouter()

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: filters.search,
        category: filters.category,
        subcategory: filters.subcategory,
        paymentMethod: filters.paymentMethod,
        competenceMonth: filters.competenceMonth,
        status: filters.status,
        accountId: filters.accountId,
        type: filters.type,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
      const response = await fetch(`/api/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
        setPagination((prev) => ({
          ...prev,
          total: data.total,
          totalPages: data.totalPages,
        }))
      } else {
        throw new Error("Failed to fetch transactions")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as transações",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.limit, filters, toast])
  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
      if (response.ok) {
        toast({ title: "Transação excluída!", description: "A transação foi removida com sucesso" })
        // Disparar evento para atualizar o dashboard
        window.dispatchEvent(new CustomEvent("transaction-updated"))
        fetchTransactions()
      } else {
        throw new Error()
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a transação",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedTransactions.length === 0) return
    if (!confirm(`Tem certeza que deseja excluir ${selectedTransactions.length} transação(ões)?`))
      return

    try {
      const deletePromises = selectedTransactions.map((id) =>
        fetch(`/api/transactions/${id}`, { method: "DELETE" })
      )

      const results = await Promise.all(deletePromises)
      const failedCount = results.filter((r) => !r.ok).length

      if (failedCount === 0) {
        toast({
          title: "Transações excluídas!",
          description: `${selectedTransactions.length} transação(ões) removida(s) com sucesso`,
        })
      } else {
        toast({
          title: "Aviso",
          description: `${selectedTransactions.length - failedCount} excluídas, ${failedCount} falharam`,
          variant: "destructive",
        })
      }

      // Disparar evento para atualizar o dashboard
      window.dispatchEvent(new CustomEvent("transaction-updated"))
      setSelectedTransactions([])
      setIsAllSelected(false)
      fetchTransactions()
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir as transações",
        variant: "destructive",
      })
    }
  }

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTransactions([])
      setIsAllSelected(false)
    } else {
      setSelectedTransactions(transactions.map((t) => t.id))
      setIsAllSelected(true)
    }
  }

  const handleSelectTransaction = (id: string) => {
    setSelectedTransactions((prev) => {
      const newSelection = prev.includes(id) ? prev.filter((tid) => tid !== id) : [...prev, id]

      setIsAllSelected(newSelection.length === transactions.length)
      return newSelection
    })
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    setEditingTransaction(null)
    fetchTransactions()
  }

  const handleBulkEditSuccess = () => {
    setSelectedTransactions([])
    setIsAllSelected(false)
    // Disparar evento para atualizar o dashboard
    window.dispatchEvent(new CustomEvent("transaction-updated"))
    fetchTransactions()
  }

  const handleEdit = (transaction: TransactionWithRelations) => {
    setEditingTransaction(transaction)
    setIsDialogOpen(true)
  }

  // Função para sincronizar dados
  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const now = new Date()
      const month = now.getMonth() + 1
      const year = now.getFullYear()
      const response = await fetch("/api/sync/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      })
      if (response.ok) {
        toast({
          title: "Plataforma 100% Sincronizada!",
          description: "Todos os dados foram atualizados com sucesso.",
        })
        // Opcional: disparar evento global para recarregar abas
        window.dispatchEvent(new CustomEvent("platform-synced"))
      } else {
        toast({
          title: "Erro ao sincronizar",
          description: "Tente novamente em instantes.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro ao sincronizar",
        description: "Tente novamente em instantes.",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transações</h2>
            <p className="text-muted-foreground">
              Gerencie todas as suas movimentações financeiras
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => router.push("/transactions/import")}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <PdfStagingUpload onCommitSuccess={fetchTransactions} />
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
            <Button onClick={handleSync} disabled={isSyncing} variant="secondary">
              {isSyncing ? (
                <>
                  <RefreshCw className="animate-spin mr-2 h-4 w-4" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Dashboard
                </>
              )}
            </Button>
          </div>
        </div>

        <TransactionFilters filters={filters} onFiltersChange={setFilters} />

        {transactions.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="h-4 w-4" /> Desmarcar Todos
                  </>
                ) : (
                  <>
                    <Square className="h-4 w-4" /> Selecionar Todos
                  </>
                )}
              </Button>
              {selectedTransactions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedTransactions.length} selecionada(s)
                </span>
              )}
            </div>
            {selectedTransactions.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkEditDialogOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar Categoria ({selectedTransactions.length})
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir ({selectedTransactions.length})
                </Button>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <TransactionsSkeleton />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma transação encontrada"
            description="Comece registrando suas primeiras movimentações financeiras ou importe um arquivo CSV com suas transações."
            action={{
              label: "Nova Transação",
              onClick: () => setIsDialogOpen(true),
            }}
          />
        ) : (
          <TransactionsTable
            transactions={transactions}
            isLoading={false}
            pagination={pagination}
            onPageChange={(page) => setPagination({ ...pagination, page })}
            onEdit={handleEdit}
            onDelete={handleDelete}
            selectedTransactions={selectedTransactions}
            onSelectTransaction={handleSelectTransaction}
            isAllSelected={isAllSelected}
          />
        )}

        <TransactionDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setEditingTransaction(null)
          }}
          transaction={editingTransaction}
          onSuccess={handleSuccess}
        />

        <BulkEditCategoryDialog
          open={isBulkEditDialogOpen}
          onOpenChange={setIsBulkEditDialogOpen}
          selectedTransactions={selectedTransactions}
          onSuccess={handleBulkEditSuccess}
        />
      </div>
    </ErrorBoundary>
  )
}

// Corrigir returns soltos após o componente (garantia de build)
