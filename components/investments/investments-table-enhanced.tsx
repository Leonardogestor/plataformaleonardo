"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export type RiskLevel = "Low" | "Medium" | "High"

const TYPE_LABELS: Record<string, string> = {
  STOCKS: "Ações",
  BONDS: "Títulos",
  REAL_ESTATE: "Imóveis",
  FIXED_INCOME: "Renda Fixa",
  CRYPTO: "Cripto",
  FUNDS: "Fundos",
  OTHER: "Outro",
}

const RISK_BY_TYPE: Record<string, RiskLevel> = {
  FIXED_INCOME: "Low",
  BONDS: "Low",
  FUNDS: "Medium",
  STOCKS: "Medium",
  REAL_ESTATE: "High",
  CRYPTO: "High",
  OTHER: "Medium",
}

function toNum(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) || 0 : v
}

export interface InvestmentRow {
  id: string
  name: string
  type: string
  amount: string
  currentValue: string
  quantity: string | null
  institution: string
  ticker: string | null
  acquiredAt: string
  maturityDate: string | null
  profitability: string | null
}

interface InvestmentsTableEnhancedProps {
  investments: InvestmentRow[]
  totalPortfolioValue: number
  onEdit: (inv: InvestmentRow) => void
  onDelete: (id: string) => void
  /** When provided, shows an "Aport/Retirada" button that calls this with the row */
  onAportRetiradaClick?: (inv: InvestmentRow) => void
  /** When provided, shows a "Detalhes" button that opens drilldown for the row */
  onOpenDrilldown?: (inv: InvestmentRow) => void
}

type SortKey = "name" | "type" | "amount" | "currentValue" | "returnAbs" | "returnPct" | "pctPortfolio" | "risk"
type SortDir = "asc" | "desc"

export function InvestmentsTableEnhanced({
  investments,
  totalPortfolioValue,
  onEdit,
  onDelete,
  onAportRetiradaClick,
  onOpenDrilldown,
}: InvestmentsTableEnhancedProps) {
  const [sortKey, setSortKey] = useState<SortKey>("currentValue")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const rows = useMemo(() => {
    return investments.map((inv) => {
      const amount = toNum(inv.amount)
      const current = toNum(inv.currentValue)
      const returnAbs = current - amount
      const returnPct = amount > 0 ? (returnAbs / amount) * 100 : 0
      const pctPortfolio = totalPortfolioValue > 0 ? (current / totalPortfolioValue) * 100 : 0
      const risk = RISK_BY_TYPE[inv.type] ?? "Medium"
      return {
        ...inv,
        amountNum: amount,
        currentNum: current,
        returnAbs,
        returnPct,
        pctPortfolio,
        risk,
      }
    })
  }, [investments, totalPortfolioValue])

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1
    return [...rows].sort((a, b) => {
      let va: number | string
      let vb: number | string
      switch (sortKey) {
        case "name":
          va = a.name
          vb = b.name
          return dir * String(va).localeCompare(String(vb))
        case "type":
          va = TYPE_LABELS[a.type] ?? a.type
          vb = TYPE_LABELS[b.type] ?? b.type
          return dir * String(va).localeCompare(String(vb))
        case "amount":
          va = a.amountNum
          vb = b.amountNum
          break
        case "currentValue":
          va = a.currentNum
          vb = b.currentNum
          break
        case "returnAbs":
          va = a.returnAbs
          vb = b.returnAbs
          break
        case "returnPct":
          va = a.returnPct
          vb = b.returnPct
          break
        case "pctPortfolio":
          va = a.pctPortfolio
          vb = b.pctPortfolio
          break
        case "risk":
          va = ["Low", "Medium", "High"].indexOf(a.risk)
          vb = ["Low", "Medium", "High"].indexOf(b.risk)
          break
        default:
          return 0
      }
      const diff = (va as number) - (vb as number)
      return dir * (diff < 0 ? -1 : diff > 0 ? 1 : 0)
    })
  }, [rows, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3 opacity-50" />
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3" /> : <ArrowDown className="h-3.5 w-3" />
  }

  if (investments.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Lista de investimentos</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ordenação por valor, retorno ou % do portfólio
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 gap-1"
                    onClick={() => handleSort("name")}
                  >
                    Ativo <SortIcon column="name" />
                  </Button>
                </TableHead>
                <TableHead className="font-medium">Classe</TableHead>
                <TableHead className="font-medium text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => handleSort("amount")}
                  >
                    Investido <SortIcon column="amount" />
                  </Button>
                </TableHead>
                <TableHead className="font-medium text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => handleSort("currentValue")}
                  >
                    Valor atual <SortIcon column="currentValue" />
                  </Button>
                </TableHead>
                <TableHead className="font-medium text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => handleSort("pctPortfolio")}
                  >
                    % portfólio <SortIcon column="pctPortfolio" />
                  </Button>
                </TableHead>
                <TableHead className="font-medium text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => handleSort("returnAbs")}
                  >
                    Ganho/Perda <SortIcon column="returnAbs" />
                  </Button>
                </TableHead>
                <TableHead className="font-medium text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => handleSort("returnPct")}
                  >
                    % retorno <SortIcon column="returnPct" />
                  </Button>
                </TableHead>
                <TableHead className="font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 h-8 gap-1"
                    onClick={() => handleSort("risk")}
                  >
                    Risco <SortIcon column="risk" />
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] font-medium text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.id} className="border-border">
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {TYPE_LABELS[row.type] ?? row.type}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.amountNum)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.currentNum)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.pctPortfolio.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        row.returnAbs >= 0 ? "text-emerald-500" : "text-red-500"
                      }
                    >
                      {row.returnAbs >= 0 ? (
                        <ArrowUpRight className="inline h-3.5 w-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="inline h-3.5 w-3 mr-0.5" />
                      )}
                      {formatCurrency(row.returnAbs)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${
                      row.returnPct >= 0 ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {row.returnPct >= 0 ? "+" : ""}
                    {row.returnPct.toFixed(2)}%
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.risk === "High"
                          ? "destructive"
                          : row.risk === "Medium"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {row.risk === "High" ? "Alto" : row.risk === "Medium" ? "Médio" : "Baixo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {onOpenDrilldown && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onOpenDrilldown(row)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-3.5 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(row)}
                      >
                        <Edit className="h-3.5 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3" />
                      </Button>
                      {onAportRetiradaClick && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onAportRetiradaClick(row)}
                        >
                          Aport/Ret.
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
