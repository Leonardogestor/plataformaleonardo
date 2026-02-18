import DashboardLayout from "@/src/components/layout/DashboardLayout"
import { KPICard } from "@/src/components/cards/KPICard"
import { ChartCard } from "@/src/components/cards/ChartCard"
import { PieCard } from "@/src/components/cards/PieCard"
import { ProgressCard } from "@/src/components/cards/ProgressCard"
import { InfoCard } from "@/src/components/cards/InfoCard"
import { TransactionsTable } from "@/src/components/tables/TransactionsTable"
import { LineChart } from "@/src/components/charts/LineChart"
import { BarChart } from "@/src/components/charts/BarChart"
import { PieChart } from "@/src/components/charts/PieChart"
import {
  kpis,
  lineChartData,
  barChartData,
  pieChartData,
  transactions,
  progress,
  info,
  investments,
} from "@/src/data/mockDashboard"

import { Card } from "@/src/components/ui/Card"
import { ManusButton } from "@/src/components/ui/ManusButton"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Exemplo: Botão para organizar com Manus IA */}
      <ManusButton />
      {/* Linha 1: 4 KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {kpis.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      {/* Linha 2: 3 gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <ChartCard title="Evolução Mensal">
          <LineChart data={lineChartData} />
        </ChartCard>
        <ChartCard title="Despesas por Categoria">
          <BarChart data={barChartData} />
        </ChartCard>
        <PieCard title="Distribuição de Investimentos">
          <PieChart data={pieChartData} />
        </PieCard>
      </div>

      {/* Linha 3: 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="col-span-1">
          <span className="text-xs text-gray-500 font-medium mb-2 block">Transações Recentes</span>
          <TransactionsTable transactions={transactions} />
        </Card>
        <ProgressCard title="Meta do Mês" value={progress.value} max={progress.max} />
        <InfoCard title={info.title} info={info.info} />
        <Card className="col-span-1 flex flex-col gap-2">
          <span className="text-xs text-gray-500 font-medium mb-2 block">Investimentos</span>
          <ul className="flex flex-col gap-1">
            {investments.map((inv, idx) => (
              <li key={idx} className="flex justify-between text-sm">
                <span>{inv.title}</span>
                <span className="font-semibold">{inv.info}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  )
}
