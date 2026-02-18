import { Card } from "../ui/Card"
import React from "react"

export type TransactionType = "income" | "expense" | string
interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: TransactionType
}

interface TransactionsTableProps {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <Card className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 font-medium text-gray-500">Data</th>
            <th className="text-left py-2 px-3 font-medium text-gray-500">Descrição</th>
            <th className="text-right py-2 px-3 font-medium text-gray-500">Valor</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td className="py-2 px-3 whitespace-nowrap">{t.date}</td>
              <td className="py-2 px-3 whitespace-nowrap">{t.description}</td>
              <td
                className={`py-2 px-3 whitespace-nowrap text-right font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}
              >
                {t.type === "income" ? "+" : "-"}R$ {t.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
