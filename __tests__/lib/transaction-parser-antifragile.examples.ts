import { parseTransactionsAntifragile } from "../../lib/transaction-parser-antifragile"

// Example 1: Standard format
export async function example1_StandardFormat() {
  const text = `
    15/04/2026 PIX IFOOD RESTAURANTE 125,50
    16/04/2026 Compra débito UBER 42,00
    17/04/2026 Aplicação RDB 10000,00
    18/04/2026 Resgate RDB 10000,00
  `
  return await parseTransactionsAntifragile(text)
}

// Example 2: Value at start of line
export async function example2_ValueAtStart() {
  const text = `
    100,00 Compra débito 15/04/2026 UBER
    200,00 Transferência de João 16/04/2026
    350,75 PIX IFOOD 17/04/2026
  `
  return await parseTransactionsAntifragile(text)
}

// Example 3: Multi-line broken description
export async function example3_MultilineBroken() {
  const text = `
    15/04/2026 Compra no débito
    RESTAURANTE JAPONÊS
    Rua das Flores 123
    São Paulo SP
    280,00
    16/04/2026 PIX
    IFOOD
    45,50
  `
  return await parseTransactionsAntifragile(text)
}

// Example 4: OCR noise and bank metadata
export async function example4_OCRNoise() {
  const text = `
    09/04/2026 Mercado Carrefour
    agência: 0001 conta: 12345 dígito: 9
    referência: 123456 protocolo: ABC123
    175,50
    10/04/2026 Compra SPOTIFY
    código: BC123 banco: Santander
    19,90
  `
  return await parseTransactionsAntifragile(text)
}

// Example 5: Inconsistent ordering
export async function example5_InconsistentOrdering() {
  const text = `
    15/04/2026 PIX IFOOD 125,50
    200,00 Depósito 16/04/2026 João Silva
    17/04/2026 Aplicação RDB 5000,00
    150,00 Transferência 18/04/2026
    19/04/2026 NETFLIX 35,90
  `
  return await parseTransactionsAntifragile(text)
}

// Example 6: Thousands separators and mixed formats
export async function example6_ThousandsSeparators() {
  const text = `
    15/04/2026 Transferência 10.000,00
    16/04/2026 Aplicação RDB 1.234.567,89
    17/04/2026 Compra 150,00
    18/04/2026 PIX 99,99
  `
  return await parseTransactionsAntifragile(text)
}

// Example 7: Investment transactions
export async function example7_Investments() {
  const text = `
    10/04/2026 Aplicação RDB 5000,00
    11/04/2026 Aplicação CDB 3000,00
    12/04/2026 Investimento em Fundo 2000,00
    13/04/2026 Resgate RDB resgate automático 5000,00
    14/04/2026 Resgate CDB 3000,00
  `
  return await parseTransactionsAntifragile(text)
}

// Example 8: PIX merchant classification
export async function example8_PIXMerchants() {
  const text = `
    15/04/2026 PIX IFOOD Restaurante 45,50
    16/04/2026 PIX UBER Viagem 32,00
    17/04/2026 PIX SPOTIFY Assinatura 19,90
    18/04/2026 PIX NETFLIX Streaming 14,90
    19/04/2026 PIX Transferência João 500,00
  `
  return await parseTransactionsAntifragile(text)
}

// Example 9: Edge case - value in middle
export async function example9_ValueInMiddle() {
  const text = `
    15/04/2026 Compra 150,00 em loja física
    16/04/2026 Pagamento 200,00 referência 123456
    17/04/2026 Transferência 500,00 para conta
  `
  return await parseTransactionsAntifragile(text)
}

// Example 10: Realistic complex statement
export async function example10_RealisticComplex() {
  const text = `
    BANCO SANTANDER - EXTRATO MENSAL
    Período: 01 a 30 de Abril de 2026

    Data, Descrição, Valor

    10/04/2026 Depósito
    Folha Pagamento
    Referência: ABC123
    5000,00

    12/04/2026 Compra Débito
    PIX IFOOD RESTAURANTE
    agência: 1234 conta: 56789
    125,50

    13/04/2026 Aplicação
    RDB Investimento
    código: BC001 banco: Bradesco
    Negociação: 10.000,00

    15/04/2026 Resgate RDB
    Crédito automático
    10.000,00

    16/04/2026 Pagamento
    SPOTIFY MENSAL
    protocolo: XYZ123
    19,90

    17/04/2026 100,00 PIX Transferência João Silva

    18/04/2026 Compra débito
    UBER TRIP FROM TO
    São Paulo SP
    42,75

    Total de entradas: 15.000,00
    Total de saídas: 188,15
  `
  return await parseTransactionsAntifragile(text)
}

export async function runAllExamples() {
  console.log("ANTIFRAGILE PARSER - EXAMPLES")
  console.log("=============================\n")

  console.log("Example 1: Standard Format")
  const e1 = await example1_StandardFormat()
  console.log(`✓ Parsed ${e1.length} transactions`)
  console.log(
    `  Confidence: avg ${(e1.reduce((s, t) => s + t.confidence, 0) / e1.length).toFixed(2)}\n`
  )

  console.log("Example 2: Value at Start of Line")
  const e2 = await example2_ValueAtStart()
  console.log(`✓ Parsed ${e2.length} transactions`)
  console.log(`  Values: ${e2.map((t) => t.value).join(", ")}\n`)

  console.log("Example 3: Multi-line Broken Description")
  const e3 = await example3_MultilineBroken()
  console.log(`✓ Parsed ${e3.length} transactions`)
  console.log(`  Descriptions: ${e3.map((t) => t.description.substring(0, 20)).join(" | ")}\n`)

  console.log("Example 4: OCR Noise and Metadata")
  const e4 = await example4_OCRNoise()
  console.log(`✓ Parsed ${e4.length} transactions`)
  console.log(`  No metadata in output: ${e4.every((t) => !t.description.includes("agência"))}\n`)

  console.log("Example 5: Inconsistent Ordering")
  const e5 = await example5_InconsistentOrdering()
  console.log(`✓ Parsed ${e5.length} transactions`)
  console.log(`  All valid: ${e5.every((t) => t.value > 0 && t.description.length > 0)}\n`)

  console.log("Example 6: Thousands Separators")
  const e6 = await example6_ThousandsSeparators()
  console.log(`✓ Parsed ${e6.length} transactions`)
  console.log(`  Largest: ${Math.max(...e6.map((t) => t.value)).toLocaleString("pt-BR")}\n`)

  console.log("Example 7: Investment Transactions")
  const e7 = await example7_Investments()
  console.log(`✓ Parsed ${e7.length} transactions`)
  const investCount = e7.filter((t) => t.type === "INVESTIMENTO").length
  const incomeCount = e7.filter((t) => t.type === "INCOME").length
  console.log(`  INVESTIMENTO: ${investCount}, INCOME: ${incomeCount}\n`)

  console.log("Example 8: PIX Merchant Classification")
  const e8 = await example8_PIXMerchants()
  console.log(`✓ Parsed ${e8.length} transactions`)
  console.log(`  Categories: ${Array.from(new Set(e8.map((t) => t.category))).join(", ")}\n`)

  console.log("Example 9: Value in Middle")
  const e9 = await example9_ValueInMiddle()
  console.log(`✓ Parsed ${e9.length} transactions`)
  console.log(`  Values: ${e9.map((t) => t.value).join(", ")}\n`)

  console.log("Example 10: Realistic Complex Statement")
  const e10 = await example10_RealisticComplex()
  console.log(`✓ Parsed ${e10.length} transactions`)
  console.log(
    `  Avg Confidence: ${(e10.reduce((s, t) => s + t.confidence, 0) / e10.length).toFixed(2)}`
  )
  console.log(`  Types: ${e10.map((t) => t.type).join(", ")}\n`)

  console.log("=============================")
  console.log("ALL EXAMPLES COMPLETED SUCCESSFULLY")
}
