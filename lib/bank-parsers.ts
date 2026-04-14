// Apenas exporta a função de detecção de banco, útil para hint do modelo de IA
export type BankId = "itau" | "bradesco" | "nubank" | "generic"

export function detectBankFromText(text: string): BankId {
  const lower = text.toLowerCase().replace(/\s+/g, " ")
  if (lower.includes("itau") || lower.includes("itaú") || lower.includes("itau unibanco"))
    return "itau"
  if (lower.includes("bradesco")) return "bradesco"
  if (lower.includes("nubank") || lower.includes("nu pagamentos") || lower.includes("nu bank"))
    return "nubank"
  return "generic"
}
