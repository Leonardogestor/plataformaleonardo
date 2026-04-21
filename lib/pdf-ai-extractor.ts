
export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
}

const SYSTEM_PROMPT = `Você é especialista em extratos bancários brasileiros. Analise o texto extraído do PDF e extraia TODAS as transações individuais. Retorne APENAS JSON válido, sem texto adicional, sem markdown, sem explicações. Formato obrigatório: {"transactions":[{"date":"YYYY-MM-DD","description":"nome","amount":99.99,"type":"EXPENSE","category":"Alimentação"}]}. Regras: EXPENSE=saída/compra/transferência enviada, INCOME=entrada/transferência recebida/resgate, TRANSFER=investimento/aplicação. amount sempre positivo sem R$. Ignore saldos totais e cabeçalhos. Inclua TODAS as transações.`

export async function extractTransactionsFromPdfWithAI(
  extractedText: string
): Promise<{ transactions: ExtractedTransaction[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[AI] OPENAI_API_KEY não configurada")
    return { transactions: [] }
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: extractedText.slice(0, 100_000) },
        ],
        max_tokens: 4096,
        temperature: 0.0,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[AI] Chat Completions erro " + res.status + ": " + err)
      return { transactions: [] }
    }

    const data = await res.json()
    const rawText = data.choices?.[0]?.message?.content || ""
    console.log("[AI] Texto recebido (" + rawText.length + " chars):", rawText.slice(0, 200))

    const cleaned = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    if (!cleaned) {
      console.error("[AI] Resposta vazia da API")
      return { transactions: [] }
    }

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      console.error("[AI] JSON inválido:", cleaned.slice(0, 300))
      return { transactions: [] }
    }

    const transactions: ExtractedTransaction[] = (parsed.transactions ?? [])
      .filter((t: any) => t.date && t.amount && t.type)
      .map((t: any) => ({
        date: String(t.date),
        description: String(t.description ?? "Sem descrição").slice(0, 200),
        amount: Math.abs(Number(t.amount) || 0),
        type: (["INCOME", "EXPENSE", "TRANSFER"].includes(t.type)
          ? t.type
          : "EXPENSE") as ExtractedTransaction["type"],
        category: String(t.category ?? "Outros"),
      }))
      .filter((t: ExtractedTransaction) => t.amount > 0)

    console.log("[AI] " + transactions.length + " transações extraídas")
    return { transactions }
  } catch (error) {
    console.error("[AI] Erro geral:", error)
    return { transactions: [] }
  }
}
