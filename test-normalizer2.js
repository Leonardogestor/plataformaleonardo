function cleanDescription(rawDesc) {
  let cleaned = rawDesc.trim()
  
  // Remover PRIMEIRO os prefixos banc
ários
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
  
  // DEPOIS: remover sufixos
  cleaned = cleaned.replace(/\s+[A-Z]\s*$/, "") // Remove letra solta no final
  cleaned = cleaned.replace(/\s+\d{1,3}\s*$/, "") // Remove números
  
  // Limpar espaços múltiplos
  cleaned = cleaned.replace(/\s+/g, " ").trim()
  
  return cleaned
}

// Teste com debug
const tests = [
  "Compra no débito BELLA PORTAL PADARIA L",
  "Compra débito DROGARIA SAO PAULO SA",
  "Pagamento de fatura NETFLIX",
]

tests.forEach(desc => {
  console.log(`1. Original: "${desc}"`)
  
  let step1 = desc.trim()
  console.log(`2. Após trim: "${step1}"`)
  
  // Remove prefixos
  const prefixes = [
    "Compra no débito",
    "Compra débito", 
    "Pagamento de fatura",
  ]
  
  for (const prefix of prefixes) {
    const regex = new RegExp(`^${prefix}\s+`, "i")
    if (regex.test(step1)) {
      step1 = step1.replace(regex, "")
      console.log(`3. Após remover "${prefix}": "${step1}"`)
      break
    }
  }
  
  // Remove sufixos
  step1 = step1.replace(/\s+[A-Z]\s*$/, "")
  console.log(`4. Após remover letra final: "${step1}"`)
  
  console.log(`FINAL: "${step1}"\n`)
})
