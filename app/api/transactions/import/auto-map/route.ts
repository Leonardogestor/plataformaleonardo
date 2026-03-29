// @ts-nocheck - TypeScript disabled for auto-mapping file
import { NextRequest, NextResponse } from "next/server"

interface AutoMappingResult {
  success: boolean
  transactions: any[]
  confidence: number
  errors?: string[]
  mapping?: Record<string, string>
}

// Função para detectar tipo de transação baseado no conteúdo
function detectTransactionType(value: any, description: string): string {
  const desc = (description || "").toLowerCase()
  const val = parseFloat(value) || 0

  // Palavras-chave que indicam despesas
  const expenseKeywords = [
    "pagamento",
    "compra",
    "débito",
    "debito",
    "saque",
    "transferência enviada",
    "taxa",
    "juros",
    "multa",
    "fatura",
    "boleto",
    "supermercado",
    "restaurante",
    "combustível",
    "farmácia",
    "transporte",
    "aluguel",
  ]

  // Palavras-chave que indicam receitas
  const incomeKeywords = [
    "recebimento",
    "crédito",
    "credito",
    "depósito",
    "salário",
    "transferência recebida",
    "rendimento",
    "juros recebidos",
    "dividendos",
    "venda",
    "reembolso",
  ]

  // Se valor for negativo, provavelmente é despesa
  if (val < 0) return "EXPENSE"

  // Se valor for positivo e contém palavras de receita
  if (incomeKeywords.some((keyword) => desc.includes(keyword))) return "INCOME"

  // Se contém palavras de despesa
  if (expenseKeywords.some((keyword) => desc.includes(keyword))) return "EXPENSE"

  // Se valor for positivo e não tem contexto claro, assume receita
  if (val > 0) return "INCOME"

  return "EXPENSE" // Default
}

// Função para detectar e formatar data
// @ts-ignore - TypeScript strict check disabled for this function
function detectDate(dateValue: any): string {
  if (!dateValue) {
    const today = new Date().toISOString().split("T")
    return today[0] || "2024-01-01"
  }

  // Se já for string de data, tenta formatar
  if (typeof dateValue === "string") {
    const dateStr = String(dateValue)
    // Remove timezone info se existir
    const cleanDate = dateStr.split("T")[0]

    if (!cleanDate) {
      const today = new Date().toISOString().split("T")
      return today[0] || "2024-01-01"
    }

    // Tenta diferentes formatos
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    ]

    if (cleanDate && formats[0].test(cleanDate)) return cleanDate! // YYYY-MM-DD
    if (cleanDate && formats[1].test(cleanDate)) {
      const parts = cleanDate!.split("/")
      if (parts.length === 3) {
        const day = parts[0]
        const month = parts[1]
        const year = parts[2]
        return `${year}-${month}-${day}`
      }
    }
    if (cleanDate && formats[2].test(cleanDate)) {
      const parts = cleanDate!.split("-")
      if (parts.length === 3) {
        const day = parts[0]
        const month = parts[1]
        const year = parts[2]
        return `${year}-${month}-${day}`
      }
    }
  }

  // Se for timestamp ou número
  if (typeof dateValue === "number") {
    const dateParts = new Date(dateValue).toISOString().split("T")
    return dateParts[0] || "2024-01-01"
  }

  const fallbackDate = new Date().toISOString().split("T")
  return fallbackDate[0] || "2024-01-01"
}

// Função para limpar e formatar valor
function cleanAmount(amountValue: any): number {
  if (typeof amountValue === "number") return Math.abs(amountValue)

  if (typeof amountValue === "string") {
    const amountStr = String(amountValue)
    // Remove símbolos monetários
    let clean = amountStr.replace(/[R$\$\€\£\s]/g, "")
    
    // Formato brasileiro: 1.234,56 -> 1234.56
    // Remove pontos de milhar primeiro, depois troca vírgula decimal por ponto
    clean = clean.replace(/\./g, "").replace(/,/g, ".")
    
    // Remove qualquer outro caractere não numérico exceto ponto e sinal
    clean = clean.replace(/[^\d.-]/g, "")

    const parsed = parseFloat(clean)
    return isNaN(parsed) ? 0 : Math.abs(parsed)
  }

  return 0
}

// Função para detectar categoria baseada na descrição
function detectCategory(description: string, type: string): string {
  const desc = description.toLowerCase().trim()

  // Debug: mostrar descrição para análise
  console.log(`Analisando descrição: "${desc}" | Tipo: ${type}`)

  // Categorias comuns para despesas
  if (type === "EXPENSE") {
    if (
      desc.includes("supermercado") ||
      desc.includes("mercado") ||
      desc.includes("comida") ||
      desc.includes("feira") ||
      desc.includes("açougue") ||
      desc.includes("padaria") ||
      desc.includes("restaurante") ||
      desc.includes("café") ||
      desc.includes("lanche") ||
      desc.includes("pizza") ||
      desc.includes("hambúrguer") ||
      desc.includes("refeição") ||
      desc.includes("almoço") ||
      desc.includes("jantar") ||
      desc.includes("marmita")
    )
      return "Alimentação"
    if (
      desc.includes("combustível") ||
      desc.includes("gasolina") ||
      desc.includes("transporte") ||
      desc.includes("uber") ||
      desc.includes("taxi") ||
      desc.includes("ônibus") ||
      desc.includes("metrô") ||
      desc.includes("estacionamento") ||
      desc.includes("pedágio") ||
      desc.includes("99") ||
      desc.includes("transporte") ||
      desc.includes("corrida")
    )
      return "Transporte"
    if (
      desc.includes("farmácia") ||
      desc.includes("remédio") ||
      desc.includes("saúde") ||
      desc.includes("médico") ||
      desc.includes("dentista") ||
      desc.includes("plano") ||
      desc.includes("hospital") ||
      desc.includes("exame") ||
      desc.includes("droga")
    )
      return "Saúde"
    if (
      desc.includes("aluguel") ||
      desc.includes("condomínio") ||
      desc.includes("iptu") ||
      desc.includes("financiamento") ||
      desc.includes("imóvel") ||
      desc.includes("casa") ||
      desc.includes("apartamento") ||
      desc.includes("financi")
    )
      return "Moradia"
    if (
      desc.includes("conta") ||
      desc.includes("energia") ||
      desc.includes("água") ||
      desc.includes("luz") ||
      desc.includes("celpe") ||
      desc.includes("sabesp") ||
      desc.includes("gás") ||
      desc.includes("sanear") ||
      desc.includes("energia") ||
      desc.includes("água") ||
      desc.includes("esgoto")
    )
      return "Utilidades"
    if (
      desc.includes("internet") ||
      desc.includes("telefone") ||
      desc.includes("celular") ||
      desc.includes("vivo") ||
      desc.includes("claro") ||
      desc.includes("tim") ||
      desc.includes("oi") ||
      desc.includes("net") ||
      desc.includes("wifi")
    )
      return "Comunicação"
    if (
      desc.includes("escola") ||
      desc.includes("curso") ||
      desc.includes("livro") ||
      desc.includes("faculdade") ||
      desc.includes("mensalidade") ||
      desc.includes("aula") ||
      desc.includes("educação") ||
      desc.includes("escolar")
    )
      return "Educação"
    if (
      desc.includes("roupa") ||
      desc.includes("vestuário") ||
      desc.includes("calçado") ||
      desc.includes("loja") ||
      desc.includes("shopping") ||
      desc.includes("compra") ||
      desc.includes("magazine") ||
      desc.includes("vestuário")
    )
      return "Vestuário"
    if (
      desc.includes("cinema") ||
      desc.includes("teatro") ||
      desc.includes("show") ||
      desc.includes("netflix") ||
      desc.includes("spotify") ||
      desc.includes("prime") ||
      desc.includes("jogo") ||
      desc.includes("entretenimento") ||
      desc.includes("streaming")
    )
      return "Lazer"
    if (
      desc.includes("banco") ||
      desc.includes("taxa") ||
      desc.includes("juros") ||
      desc.includes("multa") ||
      desc.includes("cartão") ||
      desc.includes("anuidade") ||
      desc.includes("tarifa") ||
      desc.includes("cheque")
    )
      return "Serviços Bancários"

    console.log(`Despesa não categorizada: "${desc}" -> Outras Despesas`)
    return "Outras Despesas"
  }

  // Categorias comuns para receitas
  if (type === "INCOME") {
    if (
      desc.includes("salário") ||
      desc.includes("holerite") ||
      desc.includes("pagamento") ||
      desc.includes("contracheque") ||
      desc.includes("mensalidade") ||
      desc.includes("ordenado") ||
      desc.includes("salario") ||
      desc.includes("folha") ||
      desc.includes("pgto")
    )
      return "Salário"
    if (
      desc.includes("freelance") ||
      desc.includes("pj") ||
      desc.includes("serviço") ||
      desc.includes("consultoria") ||
      desc.includes("projeto") ||
      desc.includes("honorário") ||
      desc.includes("autônomo") ||
      desc.includes("prestador") ||
      desc.includes("profissional")
    )
      return "Trabalho Autônomo"
    if (
      desc.includes("rendimento") ||
      desc.includes("juros") ||
      desc.includes("dividendo") ||
      desc.includes("cdb") ||
      desc.includes("tesouro") ||
      desc.includes("fundo") ||
      desc.includes("ação") ||
      desc.includes("investimento") ||
      desc.includes("rentabilidade") ||
      desc.includes("resgate")
    )
      return "Investimentos"
    if (
      desc.includes("venda") ||
      desc.includes("produto") ||
      desc.includes("mercadoria") ||
      desc.includes("cliente") ||
      desc.includes("faturamento") ||
      desc.includes("recebimento") ||
      desc.includes("nota") ||
      desc.includes("fatura") ||
      desc.includes("cobrança")
    )
      return "Vendas"
    if (
      desc.includes("aluguel") ||
      desc.includes("imóvel") ||
      desc.includes("locação") ||
      desc.includes("condomínio") ||
      desc.includes("aluguel") ||
      desc.includes("imobiliário")
    )
      return "Aluguéis"
    if (
      desc.includes("presente") ||
      desc.includes("doação") ||
      desc.includes("bonificação") ||
      desc.includes("bônus") ||
      desc.includes("prêmio") ||
      desc.includes("brinde")
    )
      return "Outras Receitas"
    if (
      desc.includes("transferência") ||
      desc.includes("depósito") ||
      desc.includes("entrada") ||
      desc.includes("crédito") ||
      desc.includes("receita") ||
      desc.includes("pix") ||
      desc.includes("ted") ||
      desc.includes("doc")
    )
      return "Transferências"

    console.log(`Receita não categorizada: "${desc}" -> Outras Receitas`)
    return "Outras Receitas"
  }
}

// Função para detectar o tipo de cada coluna
function detectColumnTypes(headers: string[], rows: any[]): Record<string, string> {
  const columnTypes: Record<string, string> = {}
  
  headers.forEach(header => {
    const samples = rows.slice(0, 10).map(row => row[header]).filter(val => val !== undefined && val !== null)
    
    if (samples.length === 0) {
      columnTypes[header] = "description"
      return
    }
    
    // Verificar se é coluna de valor (mais rigoroso)
    const valuePattern = /^[R$\$]?\s?-?\d{1,3}(?:\.\d{3})*(?:,\d{2})?$|^-?\d{1,3}(?:\.\d{3})*(?:,\d{2})?$/
    let valueMatches = 0
    
    samples.forEach(sample => {
      const str = String(sample).trim()
      // Remove R$ e espaços para teste
      const testStr = str.replace(/^R\$\s*/, '').replace(/\s+$/, '')
      
      // Testa formato brasileiro: 1.234,56 ou 1234,56
      if (valuePattern.test(testStr) || /^\d+,\d{2}$/.test(testStr)) {
        valueMatches++
      }
    })
    
    // Se mais de 70% das amostras corresponderem a valor, considera coluna de valor
    if (valueMatches / samples.length > 0.7) {
      columnTypes[header] = "amount"
      return
    }
    
    // Verificar se é coluna de data
    const datePattern = /^\d{2}[\/\-]\d{2}[\/\-]\d{4}$|^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/
    const isDateColumn = samples.some(sample => {
      const str = String(sample).trim()
      return datePattern.test(str) || !isNaN(Date.parse(str))
    })
    
    if (isDateColumn) {
      columnTypes[header] = "date"
      return
    }
    
    // Se não for valor nem data, é descrição
    columnTypes[header] = "description"
  })
  
  return columnTypes
}

// Função principal de mapeamento automático
function autoMapData(headers: string[], rows: any[]): AutoMappingResult {
  const transactions: any[] = []
  const errors: string[] = []
  let confidence = 0

  console.log("=== INICIANDO MAPEAMENTO AUTOMÁTICO ===")
  console.log("Headers:", headers)
  console.log("Total de linhas:", rows.length)

  // Detectar tipos de cada coluna
  const columnTypes = detectColumnTypes(headers, rows)

  // Encontrar colunas por tipo
  const amountColumn = headers.find((h) => columnTypes[h] === "amount")
  const dateColumn = headers.find((h) => columnTypes[h] === "date")
  const descriptionColumns = headers.filter((h) => columnTypes[h] === "description")

  console.log("Colunas detectadas:")
  console.log("- Valor:", amountColumn)
  console.log("- Data:", dateColumn)
  console.log("- Descrição:", descriptionColumns)

  if (!amountColumn) {
    console.log("ERRO: Nenhuma coluna de valor encontrada!")
    return {
      success: false,
      transactions: [],
      confidence: 0,
      errors: ["Nenhuma coluna de valor encontrada no arquivo"],
    }
  }

  // Processar cada linha
  rows.forEach((row, index) => {
    try {
      console.log(`\n--- Processando linha ${index + 1} ---`)

      const transaction: any = {
        id: `auto-${index}`,
        type: "EXPENSE",
        category: "Outros",
        amount: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
        accountId: null,
      }

      // Extrair valor da coluna detectada
      if (amountColumn && row[amountColumn] !== undefined) {
        transaction.amount = cleanAmount(row[amountColumn])
        console.log(`Valor: "${row[amountColumn]}" -> ${transaction.amount}`)
      }

      // Extrair data da coluna detectada
      if (dateColumn && row[dateColumn] !== undefined) {
        transaction.date = detectDate(row[dateColumn])
        console.log(`Data: "${row[dateColumn]}" -> ${transaction.date}`)
      }

      // Extrair descrição da primeira coluna de texto disponível
      let descriptionFound = false
      for (const descColumn of descriptionColumns) {
        if (row[descColumn] && String(row[descColumn]).trim()) {
          let descValue = String(row[descColumn]).trim()
          
          // Se for DEBITO ou CREDITO, não usar como descrição
          if (descValue.toLowerCase() === "debito" || descValue.toLowerCase() === "credito") {
            console.log(`Ignorando "${descValue}" como descrição (é tipo)`)
            continue
          }
          
          transaction.description = descValue
          console.log(`Descrição: "${descValue}"`)
          descriptionFound = true
          break
        }
      }
      
      // Se não encontrou descrição nas colunas de texto, procurar em todas
      if (!descriptionFound) {
        for (const header of headers) {
          if (header !== amountColumn && header !== dateColumn) {
            const value = row[header]
            if (value !== undefined && value !== null && String(value).trim()) {
              let descValue = String(value).trim()
              
              // Se for DEBITO ou CREDITO, não usar como descrição
              if (descValue.toLowerCase() === "debito" || descValue.toLowerCase() === "credito") {
                console.log(`Ignorando "${descValue}" como descrição alternativa (é tipo)`)
                continue
              }
              
              transaction.description = descValue
              console.log(`Descrição alternativa: "${descValue}" (coluna: ${header})`)
              break
            }
          }
        }
      }

      // Detectar tipo automaticamente
      transaction.type = detectTransactionType(transaction.amount, transaction.description)
      
      // Detectar categoria automaticamente
      transaction.category = detectCategory(transaction.description, transaction.type)

      console.log(
        `Resultado: ${transaction.type} | ${transaction.category} | R$${transaction.amount} | "${transaction.description}"`
      )

      // Validação básica
      if (transaction.amount > 0 && transaction.description) {
        transactions.push(transaction)
        confidence += 1
      } else {
        console.log(
          `⚠️ Linha ${index + 1} ignorada: valor=${transaction.amount}, descrição="${transaction.description}"`
        )
        errors.push(`Linha ${index + 1}: Dados insuficientes`)
      }
    } catch (error) {
      console.error(`Erro na linha ${index + 1}:`, error)
      errors.push(`Linha ${index + 1}: Erro ao processar`)
    }
  })

  confidence = transactions.length > 0 ? (confidence / rows.length) * 100 : 0

  return {
    success: transactions.length > 0,
    transactions,
    confidence,
    errors: errors.length > 0 ? errors : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { headers, rows } = body

    if (!headers || !rows || !Array.isArray(headers) || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Dados inválidos. Envie headers e rows como arrays." },
        { status: 400 }
      )
    }

    console.log(
      `Iniciando mapeamento automático para ${rows.length} linhas com ${headers.length} colunas`
    )

    const result = autoMapData(headers, rows)

    console.log(
      `Mapeamento concluído: ${result.transactions.length} transações processadas com ${result.confidence.toFixed(1)}% de confiança`
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Erro no mapeamento automático:", error)
    return NextResponse.json({ error: "Erro ao processar mapeamento automático" }, { status: 500 })
  }
}
