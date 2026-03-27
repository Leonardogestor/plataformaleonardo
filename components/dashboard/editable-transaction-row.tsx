"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Edit, MoreHorizontal, Undo, Save, X } from "lucide-react"
import { EditableTransaction } from "@/types/editable-data"
import { cn } from "@/lib/utils"

interface EditableTransactionRowProps {
  transaction: EditableTransaction
  onEdit: (field: keyof EditableTransaction, value: any) => void
  onRevert: (field: keyof EditableTransaction) => void
  onSave: () => void
  isEdited: boolean
}

export function EditableTransactionRow({
  transaction,
  onEdit,
  onRevert,
  onSave,
  isEdited,
}: EditableTransactionRowProps) {
  const [editingField, setEditingField] = useState<keyof EditableTransaction | null>(null)
  const [tempValue, setTempValue] = useState("")

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getFinalValue = <T,>(field: { originalValue: T; overrideValue?: T }) =>
    field.overrideValue ?? field.originalValue

  const isFieldEdited = (field: keyof EditableTransaction) => {
    const fieldValue = transaction[field] as any
    return fieldValue?.isEdited || false
  }

  const startEditing = (field: keyof EditableTransaction) => {
    setEditingField(field)
    const currentValue = getFinalValue(transaction[field] as any) as string | number

    if (field === "amount") {
      setTempValue(currentValue.toString())
    } else if (field === "date") {
      setTempValue(currentValue.toString())
    } else {
      setTempValue(currentValue.toString())
    }
  }

  const saveEdit = () => {
    if (!editingField) return

    let value: any = tempValue

    if (editingField === "amount") {
      value = parseFloat(tempValue)
      if (isNaN(value)) return
    }

    onEdit(editingField, value)
    setEditingField(null)
    setTempValue("")
  }

  const cancelEdit = () => {
    setEditingField(null)
    setTempValue("")
  }

  const revertField = (field: keyof EditableTransaction) => {
    onRevert(field)
  }

  const getFarolBadge = (status: "green" | "yellow" | "red") => {
    const colors = {
      green: "bg-green-100 text-green-800",
      yellow: "bg-yellow-100 text-yellow-800",
      red: "bg-red-100 text-red-800",
    }
    return <Badge className={colors[status]}>{status.toUpperCase()}</Badge>
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 border-b transition-colors",
        isEdited && "bg-blue-50/50 border-blue-200"
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Date */}
        <div className="w-24">
          {editingField === "date" ? (
            <input
              type="date"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="px-2 py-1 text-sm border rounded"
              autoFocus
            />
          ) : (
            <div
              className={cn(
                "text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded",
                isFieldEdited("date") && "font-medium text-blue-600"
              )}
              onClick={() => startEditing("date")}
            >
              {formatDate(getFinalValue(transaction.date))}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="flex-1">
          {editingField === "description" ? (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="px-2 py-1 text-sm border rounded w-full"
              autoFocus
            />
          ) : (
            <div
              className={cn(
                "text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded",
                isFieldEdited("description") && "font-medium text-blue-600"
              )}
              onClick={() => startEditing("description")}
            >
              {getFinalValue(transaction.description)}
            </div>
          )}
        </div>

        {/* Category */}
        <div className="w-32">
          {editingField === "category" ? (
            <input
              type="text"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="px-2 py-1 text-sm border rounded w-full"
              autoFocus
            />
          ) : (
            <div
              className={cn(
                "text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded",
                isFieldEdited("category") && "font-medium text-blue-600"
              )}
              onClick={() => startEditing("category")}
            >
              {getFinalValue(transaction.category)}
            </div>
          )}
        </div>

        {/* Type */}
        <div className="w-24">
          {editingField === "type" ? (
            <select
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="px-2 py-1 text-sm border rounded w-full"
              autoFocus
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
              <option value="investment">Investimento</option>
              <option value="investment_withdraw">Resgate</option>
            </select>
          ) : (
            <div
              className={cn(
                "text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded",
                isFieldEdited("type") && "font-medium text-blue-600"
              )}
              onClick={() => startEditing("type")}
            >
              {getFinalValue(transaction.type) === "income"
                ? "Receita"
                : getFinalValue(transaction.type) === "expense"
                  ? "Despesa"
                  : getFinalValue(transaction.type) === "investment"
                    ? "Investimento"
                    : "Resgate"}
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="w-28 text-right">
          {editingField === "amount" ? (
            <input
              type="number"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="px-2 py-1 text-sm border rounded w-full text-right"
              autoFocus
            />
          ) : (
            <div
              className={cn(
                "text-sm font-medium cursor-pointer hover:bg-muted px-2 py-1 rounded",
                isFieldEdited("amount") && "text-blue-600"
              )}
              onClick={() => startEditing("amount")}
            >
              {formatCurrency(getFinalValue(transaction.amount))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="w-20">
          {editingField === "status" ? (
            <select
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="px-2 py-1 text-xs border rounded w-full"
              autoFocus
            >
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>
          ) : (
            <div onClick={() => startEditing("status")}>
              {getFarolBadge(getFinalValue(transaction.status))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
        {editingField ? (
          <>
            <Button size="sm" onClick={saveEdit}>
              <Save className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={cancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            {isEdited && (
              <Button size="sm" variant="outline" onClick={onSave}>
                <Save className="h-3 w-3 mr-1" />
                Salvar
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startEditing("description")}>
                  <Edit className="h-3 w-3 mr-2" />
                  Editar
                </DropdownMenuItem>

                {isFieldEdited("amount") && (
                  <DropdownMenuItem onClick={() => revertField("amount")}>
                    <Undo className="h-3 w-3 mr-2" />
                    Reverter Valor
                  </DropdownMenuItem>
                )}
                {isFieldEdited("category") && (
                  <DropdownMenuItem onClick={() => revertField("category")}>
                    <Undo className="h-3 w-3 mr-2" />
                    Reverter Categoria
                  </DropdownMenuItem>
                )}
                {isFieldEdited("type") && (
                  <DropdownMenuItem onClick={() => revertField("type")}>
                    <Undo className="h-3 w-3 mr-2" />
                    Reverter Tipo
                  </DropdownMenuItem>
                )}
                {isFieldEdited("status") && (
                  <DropdownMenuItem onClick={() => revertField("status")}>
                    <Undo className="h-3 w-3 mr-2" />
                    Reverter Status
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  )
}
