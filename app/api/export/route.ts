import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateMonthlyReport, generateAnnualReport } from "@/lib/reports"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { z } from "zod"

const csvExportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  transactionType: z.string().optional(),
  category: z.string().optional(),
})

const reportExportSchema = z.object({
  reportType: z.enum(["monthly", "annual"]),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2000).max(2100),
  format: z.enum(["excel", "pdf"]),
})
// Função helper para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

// Exportar transações como CSV
async function exportTransactionsCSV(
  userId: string,
  filters: {
    startDate?: Date
    endDate?: Date
    type?: string
    category?: string
  }
): Promise<string> {
  const where: any = {
    userId,
  }
  
  if (filters.startDate) where.date = { ...where.date, gte: filters.startDate }
  if (filters.endDate) where.date = { ...where.date, lte: filters.endDate }
  if (filters.type) where.type = filters.type
  if (filters.category) where.category = filters.category

  const transactions = await prisma.transaction.findMany({
    where,
    include: {
      account: { select: { name: true } },
      card: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  })

  const csvHeader = "Data,Tipo,Categoria,Descrição,Valor,Conta,Cartão\n"
  const csvRows = transactions
    .map((t) =>
      [
        new Date(t.date).toLocaleDateString("pt-BR"),
        t.type,
        t.category,
        `"${t.description}"`,
        Number(t.amount).toFixed(2),
        t.account?.name || "",
        t.card?.name || "",
      ].join(",")
    )
    .join("\n")

  return csvHeader + csvRows
}

// Exportar relatório como Excel
interface ExportParams {
  month?: number
  year: number
}

async function exportReportExcel(
  userId: string,
  type: "monthly" | "annual",
  params: ExportParams
) {
  const report =
    type === "monthly"
      ? await generateMonthlyReport(userId, params.month!, params.year)
      : await generateAnnualReport(userId, params.year)

  const workbook = XLSX.utils.book_new()

  if (type === "monthly") {
    const monthlyReport = report as any

    // Aba: Relatório Estruturado
    const structuredData = [
      ["RELATÓRIO ESTRUTURADO"],
      ["Período", `${monthlyReport.period.month}/${monthlyReport.period.year}`],
      [""],
      ["Diagnóstico", monthlyReport.diagnostico ?? ""],
      ["Principal risco", monthlyReport.principal_risco ?? ""],
      ["Principal oportunidade", monthlyReport.principal_oportunidade ?? ""],
      ["Decisão recomendada", monthlyReport.decisao_recomendada ?? ""],
      [""],
      ["BENCHMARKING COMPARATIVO"],
      ["Métrica", "Seu valor", "Referência", "Status"],
      ...(monthlyReport.benchmarking_comparativo || []).map((b: { metrica: string; seuValor: string; referencia: string; status: string }) => [
        b.metrica,
        b.seuValor,
        b.referencia,
        b.status === "acima" ? "Acima" : b.status === "no_alvo" ? "No alvo" : "Abaixo",
      ]),
    ]
    const structuredSheet = XLSX.utils.aoa_to_sheet(structuredData)
    XLSX.utils.book_append_sheet(workbook, structuredSheet, "Relatório")

    // Aba: Resumo
    const summaryData = [
      ["RESUMO FINANCEIRO"],
      [`Período: ${monthlyReport.period.month}/${monthlyReport.period.year}`],
      [""],
      ["Métrica", "Valor"],
      ["Receita Total", formatCurrency(monthlyReport.summary.totalIncome)],
      ["Despesa Total", formatCurrency(monthlyReport.summary.totalExpense)],
      ["Fluxo de Caixa", formatCurrency(monthlyReport.summary.cashFlow)],
      ["Taxa de Poupança", `${monthlyReport.summary.savingsRate.toFixed(2)}%`],
      ["Patrimônio Líquido", formatCurrency(monthlyReport.summary.netWorth)],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo")

    // Aba: Top Categorias
    const categoriesData = [
      ["Categoria", "Valor", "Percentual", "Transações"],
      ...monthlyReport.topCategories.map((c: { category: string; amount: number; percentage: number; count: number }) => [
        c.category,
        c.amount,
        `${c.percentage.toFixed(2)}%`,
        c.count,
      ]),
    ]
    const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesData)
    XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Categorias")
  } else {
    const annualReport = report as any

    // Aba: Relatório Estruturado
    const structuredData = [
      ["RELATÓRIO ESTRUTURADO"],
      ["Ano", annualReport.period.year],
      [""],
      ["Diagnóstico", annualReport.diagnostico ?? ""],
      ["Principal risco", annualReport.principal_risco ?? ""],
      ["Principal oportunidade", annualReport.principal_oportunidade ?? ""],
      ["Decisão recomendada", annualReport.decisao_recomendada ?? ""],
      [""],
      ["BENCHMARKING COMPARATIVO"],
      ["Métrica", "Seu valor", "Referência", "Status"],
      ...(annualReport.benchmarking_comparativo || []).map((b: { metrica: string; seuValor: string; referencia: string; status: string }) => [
        b.metrica,
        b.seuValor,
        b.referencia,
        b.status === "acima" ? "Acima" : b.status === "no_alvo" ? "No alvo" : "Abaixo",
      ]),
    ]
    const structuredSheet = XLSX.utils.aoa_to_sheet(structuredData)
    XLSX.utils.book_append_sheet(workbook, structuredSheet, "Relatório")

    // Aba: Resumo Anual
    const summaryData = [
      ["RESUMO ANUAL"],
      [`Ano: ${annualReport.period.year}`],
      [""],
      ["Métrica", "Valor"],
      ["Receita Total", formatCurrency(annualReport.summary.totalIncome)],
      ["Despesa Total", formatCurrency(annualReport.summary.totalExpense)],
      ["Fluxo de Caixa Total", formatCurrency(annualReport.summary.totalCashFlow)],
      ["Receita Média Mensal", formatCurrency(annualReport.summary.averageMonthlyIncome)],
      ["Despesa Média Mensal", formatCurrency(annualReport.summary.averageMonthlyExpense)],
      ["Taxa de Poupança Anual", `${annualReport.summary.annualSavingsRate.toFixed(2)}%`],
      ["Crescimento Patrimonial", formatCurrency(annualReport.summary.netWorthGrowth)],
      [
        "Crescimento Patrimonial (%)",
        `${annualReport.summary.netWorthGrowthPercentage.toFixed(2)}%`,
      ],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo")

    // Aba: Comparação Mensal
    const monthlyData = [
      ["Mês", "Receita", "Despesa", "Fluxo de Caixa", "Taxa de Poupança"],
      ...annualReport.monthlyComparison.map((m: { month: string; income: number; expense: number; cashFlow: number; savingsRate: number }) => [
        m.month,
        m.income,
        m.expense,
        m.cashFlow,
        `${m.savingsRate.toFixed(2)}%`,
      ]),
    ]
    const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData)
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "Mês a Mês")

    // Aba: Top Categorias
    const categoriesData = [
      ["Categoria", "Valor Total", "Percentual"],
      ...annualReport.topCategories.map((c: { category: string; amount: number; percentage: number }) => [
        c.category,
        c.amount,
        `${c.percentage.toFixed(2)}%`,
      ]),
    ]
    const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesData)
    XLSX.utils.book_append_sheet(workbook, categoriesSheet, "Categorias")

    // Aba: Metas
    if (annualReport.goalsProgress.length > 0) {
      const goalsData = [
        ["Meta", "Valor Alvo", "Valor Atual", "Progresso", "Status"],
        ...annualReport.goalsProgress.map((g: { name: string; targetAmount: number; currentAmount: number; progress: number; status: string }) => [
          g.name,
          g.targetAmount,
          g.currentAmount,
          `${g.progress.toFixed(2)}%`,
          g.status,
        ]),
      ]
      const goalsSheet = XLSX.utils.aoa_to_sheet(goalsData)
      XLSX.utils.book_append_sheet(workbook, goalsSheet, "Metas")
    }
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
}

// Exportar relatório como PDF (template premium)
async function exportReportPDF(
  userId: string,
  type: "monthly" | "annual",
  params: ExportParams
): Promise<Buffer> {
  const report =
    type === "monthly"
      ? await generateMonthlyReport(userId, params.month!, params.year)
      : await generateAnnualReport(userId, params.year)

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageW = (doc.internal.pageSize as { width: number }).width
  const margin = 18
  const primaryColor: [number, number, number] = [30, 64, 175] // blue-800
  const textColor: [number, number, number] = [17, 24, 39]
  const mutedColor: [number, number, number] = [100, 116, 139]

  let y = margin

  // --- Capa premium ---
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageW, 42, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont("helvetica", "bold")
  doc.text(type === "monthly" ? "Relatório Financeiro Mensal" : "Relatório Financeiro Anual", margin, 22)
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  const periodLabel = type === "monthly"
    ? `${(report as any).period.month} de ${(report as any).period.year}`
    : `Ano ${(report as any).period.year}`
  doc.text(periodLabel, margin, 32)
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`, margin, 38)
  doc.setTextColor(...textColor)
  y = 50

  // --- Relatório Estruturado ---
  const r = report as any
  if (r.diagnostico || r.principal_risco || r.principal_oportunidade || r.decisao_recomendada) {
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...primaryColor)
    doc.text("Relatório Estruturado", margin, y)
    y += 8
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...textColor)

    if (r.diagnostico) {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(80, 80, 80)
      doc.text("Diagnóstico", margin, y)
      y += 5
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...textColor)
      const diagLines = doc.splitTextToSize(r.diagnostico, pageW - 2 * margin)
      diagLines.forEach((line: string) => { doc.text(line, margin, y); y += 5 })
      y += 4
    }
    if (r.principal_risco) {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(180, 83, 9)
      doc.text("Principal risco", margin, y)
      y += 5
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...textColor)
      const riskLines = doc.splitTextToSize(r.principal_risco, pageW - 2 * margin)
      riskLines.forEach((line: string) => { doc.text(line, margin, y); y += 5 })
      y += 4
    }
    if (r.principal_oportunidade) {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(21, 128, 61)
      doc.text("Principal oportunidade", margin, y)
      y += 5
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...textColor)
      const oppLines = doc.splitTextToSize(r.principal_oportunidade, pageW - 2 * margin)
      oppLines.forEach((line: string) => { doc.text(line, margin, y); y += 5 })
      y += 4
    }
    if (r.decisao_recomendada) {
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...primaryColor)
      doc.text("Decisão recomendada", margin, y)
      y += 5
      doc.setFont("helvetica", "normal")
      doc.setTextColor(...textColor)
      const decLines = doc.splitTextToSize(r.decisao_recomendada, pageW - 2 * margin)
      decLines.forEach((line: string) => { doc.text(line, margin, y); y += 5 })
      y += 6
    }
  }

  // --- Benchmarking ---
  if (r.benchmarking_comparativo && r.benchmarking_comparativo.length > 0) {
    if (y > 240) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...primaryColor)
    doc.text("Benchmarking comparativo", margin, y)
    y += 8
    const benchBody = r.benchmarking_comparativo.map((b: { metrica: string; seuValor: string; referencia: string; status: string }) => [
      b.metrica,
      b.seuValor,
      b.referencia,
      b.status === "acima" ? "Acima" : b.status === "no_alvo" ? "No alvo" : "Abaixo",
    ])
    autoTable(doc, {
      startY: y,
      head: [["Métrica", "Seu valor", "Referência", "Status"]],
      body: benchBody,
      theme: "striped",
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 12
  }

  // --- Resumo financeiro ---
  if (y > 220) { doc.addPage(); y = margin }
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(...primaryColor)
  doc.text(type === "monthly" ? "Resumo financeiro" : "Resumo anual", margin, y)
  y += 8

  const summaryData = type === "monthly"
    ? [
        ["Receita total", formatCurrency(r.summary.totalIncome)],
        ["Despesa total", formatCurrency(r.summary.totalExpense)],
        ["Fluxo de caixa", formatCurrency(r.summary.cashFlow)],
        ["Taxa de poupança", `${r.summary.savingsRate.toFixed(2)}%`],
        ["Patrimônio líquido", formatCurrency(r.summary.netWorth)],
      ]
    : [
        ["Receita total", formatCurrency(r.summary.totalIncome)],
        ["Despesa total", formatCurrency(r.summary.totalExpense)],
        ["Fluxo de caixa total", formatCurrency(r.summary.totalCashFlow)],
        ["Receita média mensal", formatCurrency(r.summary.averageMonthlyIncome)],
        ["Despesa média mensal", formatCurrency(r.summary.averageMonthlyExpense)],
        ["Taxa de poupança anual", `${r.summary.annualSavingsRate.toFixed(2)}%`],
        ["Crescimento patrimonial", formatCurrency(r.summary.netWorthGrowth)],
        ["Crescimento patrimonial (%)", `${r.summary.netWorthGrowthPercentage.toFixed(2)}%`],
      ]

  autoTable(doc, {
    startY: y,
    head: [["Métrica", "Valor"]],
    body: summaryData,
    theme: "grid",
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
  })
  y = (doc as any).lastAutoTable.finalY + 12

  if (type === "monthly") {
    if (r.topCategories?.length > 0) {
      if (y > 230) { doc.addPage(); y = margin }
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...primaryColor)
      doc.text("Top 5 categorias de despesa", margin, y)
      y += 8
      const catData = r.topCategories.map((c: { category: string; amount: number; percentage: number; count: number }) => [
        c.category,
        formatCurrency(c.amount),
        `${c.percentage.toFixed(1)}%`,
        c.count.toString(),
      ])
      autoTable(doc, {
        startY: y,
        head: [["Categoria", "Valor", "%", "Transações"]],
        body: catData,
        theme: "striped",
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }
    if (r.insights?.length > 0 && y < 260) {
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...primaryColor)
      doc.text("Insights", margin, y)
      y += 6
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.setTextColor(...textColor)
      r.insights.forEach((insight: string) => {
        doc.text(`• ${insight}`, margin, y)
        y += 5
      })
    }
  } else {
    if (y > 200) { doc.addPage(); y = margin }
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...primaryColor)
    doc.text("Performance mensal", margin, y)
    y += 8
    const perfData = [
      ["Melhor mês", r.bestMonth.month, formatCurrency(r.bestMonth.cashFlow)],
      ["Pior mês", r.worstMonth.month, formatCurrency(r.worstMonth.cashFlow)],
    ]
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Mês", "Fluxo de caixa"]],
      body: perfData,
      theme: "striped",
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 12
    if (r.topCategories?.length > 0 && y < 230) {
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(...primaryColor)
      doc.text("Top 5 categorias do ano", margin, y)
      y += 8
      const catData = r.topCategories.map((c: { category: string; amount: number; percentage: number }) => [
        c.category,
        formatCurrency(c.amount),
        `${c.percentage.toFixed(1)}%`,
      ])
      autoTable(doc, {
        startY: y,
        head: [["Categoria", "Valor total", "%"]],
        body: catData,
        theme: "striped",
        headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
      })
    }
  }

  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...mutedColor)
    doc.text(
      `Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} — Página ${i} de ${pageCount}`,
      margin,
      (doc.internal.pageSize as { height: number }).height - 10
    )
  }

  return Buffer.from(doc.output("arraybuffer"))
}

// API Route Handler
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "csv"
    const type = searchParams.get("type") || "transactions"

    if (type === "transactions") {
      const exportData = {
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
        transactionType: searchParams.get("transactionType") || undefined,
        category: searchParams.get("category") || undefined,
      }

      const validated = csvExportSchema.parse(exportData)

      const csv = await exportTransactionsCSV(session.user.id, {
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        endDate: validated.endDate ? new Date(validated.endDate) : undefined,
        type: validated.transactionType,
        category: validated.category,
      })

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="transacoes_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    } else if (type === "report") {
      const exportData = {
        reportType: (searchParams.get("reportType") || "monthly") as "monthly" | "annual",
        month: searchParams.get("month") ? parseInt(searchParams.get("month")!) : new Date().getMonth() + 1,
        year: searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear(),
        format: format as "excel" | "pdf",
      }

      const validated = reportExportSchema.parse(exportData)

      if (validated.format === "excel") {
        const buffer = await exportReportExcel(
          session.user.id,
          validated.reportType,
          { month: validated.month, year: validated.year }
        )

        const filename =
          validated.reportType === "monthly"
            ? `relatorio_mensal_${validated.month}_${validated.year}.xlsx`
            : `relatorio_anual_${validated.year}.xlsx`

        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        })
      } else if (validated.format === "pdf") {
        const buffer = await exportReportPDF(
          session.user.id,
          validated.reportType,
          { month: validated.month, year: validated.year }
        )

        const filename =
          validated.reportType === "monthly"
            ? `relatorio_mensal_${validated.month}_${validated.year}.pdf`
            : `relatorio_anual_${validated.year}.pdf`

        return new NextResponse(Buffer.from(buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        })
      }
    }

    return NextResponse.json({ error: "Formato de exportação inválido" }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Erro ao exportar dados:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
