"use client"

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useFinancialData } from '@/hooks/use-financial-data'

export function PdfExport() {
  const { data } = useFinancialData()

  const exportToPDF = async () => {
    if (!data?.investments.length) {
      alert('Não há investimentos para exportar')
      return
    }

    try {
      // Dynamically import jsPDF to avoid SSR issues
      const { jsPDF } = await import('jspdf')
      
      const doc = new jsPDF()
      
      // Add title
      doc.setFontSize(16)
      doc.text('Relatório de Investimentos', 14, 20)
      
      // Add date
      doc.setFontSize(10)
      const date = new Date().toLocaleDateString('pt-BR')
      doc.text(`Gerado em: ${date}`, 14, 30)
      
      // Add table headers
      doc.setFontSize(12)
      doc.text('Data', 14, 50)
      doc.text('Ativo', 40, 50)
      doc.text('Tipo', 80, 50)
      doc.text('Valor', 120, 50)
      doc.text('Categoria', 150, 50)
      
      // Add horizontal line
      doc.line(14, 55, 200, 55)
      
      // Add investment data
      let yPosition = 65
      doc.setFontSize(10)
      
      data.investments.forEach((investment, index) => {
        const date = new Date(investment.date).toLocaleDateString('pt-BR')
        const asset = investment.asset.substring(0, 15) // Limit text length
        const type = investment.type.substring(0, 12)
        const amount = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(investment.amount)
        const category = investment.category.substring(0, 15)
        
        doc.text(date, 14, yPosition)
        doc.text(asset, 40, yPosition)
        doc.text(type, 80, yPosition)
        doc.text(amount, 120, yPosition)
        doc.text(category, 150, yPosition)
        
        yPosition += 10
        
        // Add new page if needed
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 20
        }
      })
      
      // Add summary
      const totalAmount = data.investments.reduce((sum, inv) => sum + inv.amount, 0)
      yPosition += 10
      doc.setFontSize(12)
      doc.text(`Total: ${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(totalAmount)}`, 14, yPosition)
      
      // Save the PDF
      doc.save(`investimentos_${new Date().toISOString().split('T')[0]}.pdf`)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    }
  }

  return (
    <Button onClick={exportToPDF} className="flex items-center gap-2">
      <Download className="h-4 w-4" />
      Exportar PDF
    </Button>
  )
}
