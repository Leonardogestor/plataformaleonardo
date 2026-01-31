"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from "@tanstack/react-table"
import { formatCurrency } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Pencil, Trash } from "lucide-react"

export interface Transaction {
  id: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
  date: string
  category: string
}

export interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const data = transactions.slice(0, 10)
  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "date",
      header: "Data",
      cell: (info) => new Date(info.getValue() as string).toLocaleDateString("pt-BR"),
    },
    {
      accessorKey: "description",
      header: "Descrição",
    },
    {
      accessorKey: "category",
      header: "Categoria",
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: (info) =>
        info.getValue() === "INCOME" ? (
          <span className="text-success flex items-center gap-1">
            <ArrowUpRight size={16} /> Receita
          </span>
        ) : (
          <span className="text-destructive flex items-center gap-1">
            <ArrowDownRight size={16} /> Despesa
          </span>
        ),
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: (info) => formatCurrency(info.getValue() as number),
    },
    {
      id: "actions",
      header: "Ações",
      cell: (info) => {
        const tx = info.row.original
        return (
          <div className="flex gap-2">
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" onClick={() => setEditTx(tx)}>
                <Pencil size={16} />
              </Button>
            </DialogTrigger>
            <Button size="icon" variant="destructive" onClick={() => setDeleteTx(tx)}>
              <Trash size={16} />
            </Button>
          </div>
        )
      },
    },
  ]
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-muted bg-dark">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-muted text-white">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2 font-semibold">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-muted">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Dialog de edição */}
        <Dialog open={!!editTx} onOpenChange={(v) => !v && setEditTx(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Transação</DialogTitle>
            </DialogHeader>
            {/* Formulário de edição simplificado */}
            {editTx && (
              <div className="space-y-2">
                <div>
                  Descrição: <input className="input" defaultValue={editTx.description} />
                </div>
                <div>
                  Valor: <input className="input" type="number" defaultValue={editTx.amount} />
                </div>
                <div>
                  Categoria: <input className="input" defaultValue={editTx.category} />
                </div>
                <div>
                  Tipo: <input className="input" defaultValue={editTx.type} />
                </div>
                <div>
                  Data:{" "}
                  <input className="input" type="date" defaultValue={editTx.date.slice(0, 10)} />
                </div>
                <Button onClick={() => setEditTx(null)}>Salvar</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Dialog de exclusão */}
        <Dialog open={!!deleteTx} onOpenChange={(v) => !v && setDeleteTx(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Transação</DialogTitle>
            </DialogHeader>
            {deleteTx && (
              <div className="space-y-2">
                <p>
                  Tem certeza que deseja excluir a transação <b>{deleteTx.description}</b>?
                </p>
                <Button variant="destructive" onClick={() => setDeleteTx(null)}>
                  Excluir
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
