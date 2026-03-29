import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import jsPDF from "jspdf"
import "jspdf-autotable"

interface AnamnesisData {
  id: string
  responses: any
  analysis: any
  profileType: string
  riskLevel: string
  createdAt: string
  updatedAt: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { anamnesis } = await request.json()

    if (!anamnesis) {
      return NextResponse.json({ error: "Dados da anámnese não fornecidos" }, { status: 400 })
    }

    // Criar PDF
    const pdf = new jsPDF()

    // Configurações iniciais
    pdf.setFontSize(20)
    pdf.text("Anámnese Financeira", 20, 30)

    pdf.setFontSize(12)
    pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, 45)
    pdf.text(`Perfil: ${anamnesis.profileType}`, 20, 55)
    pdf.text(`Nível de Risco: ${anamnesis.riskLevel}`, 20, 65)

    let yPosition = 85

    // Seção 1: Respostas
    pdf.setFontSize(16)
    pdf.text("1. Respostas do Formulário", 20, yPosition)
    yPosition += 15

    pdf.setFontSize(12)
    Object.entries(anamnesis.responses).forEach(([section, data]) => {
      if (yPosition > 250) {
        pdf.addPage()
        yPosition = 30
      }

      pdf.setFontSize(14)
      pdf.text(formatSectionName(section), 20, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      Object.entries(data as any).forEach(([key, value]) => {
        if (yPosition > 270) {
          pdf.addPage()
          yPosition = 30
        }

        const formattedKey = formatKey(key)
        const formattedValue = Array.isArray(value) ? value.join(", ") : String(value)

        pdf.text(`${formattedKey}: ${formattedValue}`, 30, yPosition)
        yPosition += 8
      })

      yPosition += 5
    })

    // Seção 2: Estratégias
    if (anamnesis.analysis?.strategies) {
      pdf.addPage()
      yPosition = 30

      pdf.setFontSize(16)
      pdf.text("2. Estratégias Personalizadas", 20, yPosition)
      yPosition += 15

      anamnesis.analysis.strategies.forEach((strategy: any, index: number) => {
        if (yPosition > 220) {
          pdf.addPage()
          yPosition = 30
        }

        pdf.setFontSize(14)
        pdf.text(`${index + 1}. ${strategy.area}`, 20, yPosition)
        yPosition += 10

        pdf.setFontSize(10)
        pdf.text(`Prioridade: ${strategy.priority}`, 30, yPosition)
        yPosition += 8
        pdf.text(`Descrição: ${strategy.description}`, 30, yPosition)
        yPosition += 8
        pdf.text(`Prazo: ${strategy.timeframe}`, 30, yPosition)
        yPosition += 8
        pdf.text(`Complexidade: ${strategy.complexity}`, 30, yPosition)
        yPosition += 12

        // Ações
        pdf.text("Ações:", 30, yPosition)
        yPosition += 8
        strategy.actions.forEach((action: string) => {
          if (yPosition > 270) {
            pdf.addPage()
            yPosition = 30
          }
          pdf.text(`• ${action}`, 40, yPosition)
          yPosition += 6
        })

        yPosition += 8
      })
    }

    // Seção 3: Recomendações
    if (anamnesis.analysis?.recommendations) {
      pdf.addPage()
      yPosition = 30

      pdf.setFontSize(16)
      pdf.text("3. Recomendações", 20, yPosition)
      yPosition += 15

      anamnesis.analysis.recommendations.forEach((rec: any, index: number) => {
        if (yPosition > 230) {
          pdf.addPage()
          yPosition = 30
        }

        pdf.setFontSize(14)
        pdf.text(`${index + 1}. ${rec.title}`, 20, yPosition)
        yPosition += 10

        pdf.setFontSize(10)
        pdf.text(`Tipo: ${rec.type} | Prioridade: ${rec.priority}`, 30, yPosition)
        yPosition += 8
        pdf.text(`${rec.description}`, 30, yPosition)
        yPosition += 12

        yPosition += 5
      })
    }

    // Seção 4: Próximos Passos
    if (anamnesis.analysis?.nextSteps) {
      pdf.addPage()
      yPosition = 30

      pdf.setFontSize(16)
      pdf.text("4. Plano de Ação", 20, yPosition)
      yPosition += 15

      anamnesis.analysis.nextSteps.forEach((step: any) => {
        if (yPosition > 240) {
          pdf.addPage()
          yPosition = 30
        }

        pdf.setFontSize(14)
        pdf.text(`${step.order}. ${step.title}`, 20, yPosition)
        yPosition += 10

        pdf.setFontSize(10)
        pdf.text(`${step.description}`, 30, yPosition)
        yPosition += 8
        pdf.text(`Tempo estimado: ${step.estimatedTime}`, 30, yPosition)
        yPosition += 12

        yPosition += 5
      })
    }

    // Rodapé
    const pageCount = (pdf as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i)
      pdf.setFontSize(8)
      pdf.text(`Página ${i} de ${pageCount}`, 105, 285)
      pdf.text("LMG Platform - Anámnese Financeira", 105, 290)
    }

    // Gerar buffer do PDF
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"))

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="anamnese-financeira-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Erro ao gerar PDF:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
      },
      { status: 500 }
    )
  }
}

function formatSectionName(section: string): string {
  const names: Record<string, string> = {
    financialContext: "Contexto Financeiro",
    lifeMoment: "Momento de Vida",
    financialBehavior: "Comportamento Financeiro",
    riskProfile: "Perfil de Risco",
    objectives: "Objetivos Financeiros",
    dataImport: "Importação de Dados",
    budgetControl: "Orçamento e Controle",
    cardsInstallments: "Cartões e Parcelamentos",
    executionCapacity: "Capacidade de Execução",
    futureExpectation: "Expectativa de Futuro",
    knowledgeExperience: "Conhecimento e Experiência",
  }
  return names[section] || section
}

function formatKey(key: string): string {
  return key
    .split(/(?=[A-Z])/)
    .join(" ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
}
