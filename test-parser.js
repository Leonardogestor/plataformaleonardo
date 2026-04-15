// Simular o parser
function parseNubankValue(valueStr) {
  valueStr = valueStr.trim()
  const isNegative = valueStr.startsWith("-") || valueStr.startsWith("(")
  const cleanValue = valueStr.replace(/[^\d,]/g, "").replace(",", ".")
  let num = parseFloat(cleanValue)
  if (isNaN(num)) num = 0
  return isNegative ? -num : num
}

function classifyTransactionType(description) {
  const desc = description.toLowerCase()
  if (desc.includes("rendimento") || desc.includes("salario") || desc.includes("depósito")) {
    return "INCOME"
  }
  if (desc.includes("transferencia") || desc.includes("pix") || desc.includes("ted")) {
    return "TRANSFER"
  }
  return "EXPENSE"
}

function parseNubankTransactions(text) {
  const transactions = []
  const lineRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-+]?[\d.]+,\d{2})$/gm
  
  let match
  while ((match = lineRegex.exec(text)) !== null) {
    const [fullLine, dateStr, description, valueStr] = match
    const date = dateStr.trim()
    const desc = description.trim()
    const valueNum = parseNubankValue(valueStr.trim())
    const type = classifyTransactionType(desc)
    
    transactions.push({
      date,
      description: desc,
      value: valueNum,
      type,
      rawLine: fullLine,
    })
  }
  
  return transactions
}

// Teste
const mockText = `
01/01/2025 UBER 3004 -45,90
02/01/2025 IFOOD RESTAURANTE -89,50
03/01/2025 SALARIO EMPRESA XYZ +3.500,00
05/01/2025 TRANSFERENCIA ENVIADA -1.000,00
07/01/2025 FARMACIA POPULACIONAL -25,80
10/01/2025 PIX RECEBIDO +200,00
15/01/2025 NETFLIX -19,90
20/01/2025 SUPERMERCADO CARREFOUR -234,56
25/01/2025 PAGUE CONTA LUZ -189,99
`

const result = parseNubankTransactions(mockText)
console.log("✅ Transações parseadas:")
result.forEach(tx => {
  console.log(`${tx.date} | ${tx.description.padEnd(35)} | R$ ${tx.value.toFixed(2).padStart(10)} | ${tx.type}`)
})
