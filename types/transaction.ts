import { Transaction } from "@prisma/client"

export type TransactionWithRelations = Transaction & {
  account: { id: string; name: string } | null
  card: { name: string; brand: string } | null
  status?: "green" | "yellow" | "red"
}
