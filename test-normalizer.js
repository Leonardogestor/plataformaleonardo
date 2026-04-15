function convertBrazilianValue(valueStr) {
  const isNegative = valueStr.startsWith("-") || valueStr.includes("(")
  const cleanValue = valueStr.replace(/[^\d,]/g, "").replace(",", ".")
  let num = parseFloat(cleanValue) || 0
  return isNegative ? -num : num
}

function cleanDescription(rawDesc) {
  let cleaned = rawDesc.trim()
  const prefixes = [
    "Compra no débito",
    "Compra débito",
    "Transferência recebida",
    "Transferência enviada",
    "Transferência",
    "Depósito",
    "Pagamento",
  ]
  for (const prefix of prefixes) {
    const regex = new RegExp(`^${prefix}\s+`, "i")
    cleaned = cleaned.replace(regex, "")
  }
  cleaned = cleaned.replace(/\s+[A-Z]\s*$/, "")
  cleaned = cleaned.replace(/\s+\d{1,3}\s*$/, "")
  cleaned = cleaned.replace(/\s+/g, " ").trim()
  return cleaned
}

function classifyCategory(desc) {
  const d = desc.toLowerCase()
  if (d.includes("padaria") || d.includes("restaurante")) return "Alimentação"
  if (d.includes("drogaria") || d.includes("farmácia")) return "Saúde"
  if (d.includes("merc") || d.includes("supermercado")) return "Mercado"
  if (d.includes("uber") || d.includes("99")) return "Transporte"
  return "Outros"
}

// Testes
const tests = [
  "Compra no débito BELLA PORTAL PADARIA L",
  "Compra débito DROGARIA SAO PAULO SA 24,90",
  "Transferência recebida PIX JOAO SILVA",
  "UBER 3004 RJ",
  "CARREFOUR SUPERMERCADO",
  "Pagamento de fatura NETFLIX",
]

console.log("✅ TESTE DE LIMPEZA:")
tests.forEach(desc => {
  console.log(`"${desc}" → "${cleanDescription(desc)}"`)
})

console.log("\n✅ TESTE DE CATEGORIZAÇÃO:")
tests.forEach(desc => {
  const cleaned = cleanDescription(desc)
  console.log(`"${cleaned}" → ${classifyCategory(cleaned)}`)
})
