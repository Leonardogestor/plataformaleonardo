import { NextResponse } from "next/server"

// Endpoint para testar parsing de valores brasileiros
export function POST(request: Request) {
  try {
    const body = request.body as any
    const { testValues } = body

    console.log('🧪 Testando parsing de valores brasileiros...')

    const results = testValues.map((value: any) => {
      let amount = 0
      
      if (typeof value === 'number') {
        amount = Math.abs(value)
      } else if (typeof value === 'string') {
        const amountStr = String(value)
        // Remove R$ and spaces
        let clean = amountStr.replace(/[R$\$\€\£\s]/g, "")
        // Brazilian format: 1.234,56 -> 1234.56
        clean = clean.replace(/\./g, "").replace(/,/g, ".")
        // Remove any other non-numeric characters except dot and minus
        clean = clean.replace(/[^\d.-]/g, "")
        amount = parseFloat(clean) || 0
      }

      return {
        original: value,
        parsed: amount,
        formatted: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(amount)
      }
    })

    return NextResponse.json({
      message: "Teste de parsing concluído",
      results
    })

  } catch (error) {
    console.error('Erro no teste:', error)
    return NextResponse.json({ error: "Erro no teste" }, { status: 500 })
  }
}
