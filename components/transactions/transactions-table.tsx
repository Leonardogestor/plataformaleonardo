"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit, Trash2 } from "lucide-react"

interface Transaction {
  id: string
  type: string
  category: string
  subcategory?: string
  amount: number
  description: string
  date: string
  isPending?: boolean
  status?: "green" | "yellow" | "red"
  account: { id: string; name: string } | null
  card?: { name: string; brand: string } | null
}

// Função TransactionsTable deve ser definida acima deste export
import React from "react"

interface TransactionsTableProps {
  transactions: Transaction[]
  isLoading: boolean
  pagination: {
    page: number
    totalPages: number
  }
  onPageChange: (page: number) => void
  onEdit?: (transaction: Transaction) => void
  onDelete?: (id: string) => void
}

function TransactionsTable({
  transactions,
  isLoading,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  // Placeholder para renderização básica
  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>
  }
  if (transactions.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed">
        <p className="text-lg font-medium">Nenhuma transação encontrada</p>
        <p className="text-sm text-muted-foreground">Crie sua primeira transação para começar</p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.date}</TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell>{t.category}</TableCell>
                <TableCell className="text-right font-mono">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(t.amount)}
                  {t.status && (
                    <div
                      className={`ml-2 inline-block w-2 h-2 rounded-full ${
                        t.status === "red"
                          ? "bg-red-500"
                          : t.status === "yellow"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      title={`Status: ${t.status}`}
                    />
                  )}
                </TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell>
                  {onEdit && (
                    <Button size="sm" variant="ghost" onClick={() => onEdit(t)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button size="sm" variant="ghost" onClick={() => onDelete(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
export default TransactionsTable
