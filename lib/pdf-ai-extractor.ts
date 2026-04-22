export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
}

const SYSTEM_PROMPT = `Você é especialista em extratos bancários brasileiros.
Analise o extrato e extraia TODAS as transações individuais.
Retorne APENAS JSON válido, sem texto adicional, sem markdown:
{"transactions":[{"date":"YYYY-MM-DD","description":"nome","amount":99.99,"type":"EXPENSE","category":"Alimentação"}]}
Regras:
- type: EXPENSE=saída/compra/transferência enviada, INCOME=entrada/transferência recebida/resgate, TRANSFER=investimento/aplicação
- amount: sempre positivo, sem R$
- date: YYYY-MM-DD
- category: Alimentação, Transporte, Saúde, Mercado, Lazer, Moradia, Transferência, Investimento, Outros
- Ignore saldos, totais, cabeçalhos
- Inclua TODAS as transações do extrato`

export async function extractTransactionsFromPdfWithAI(
  extractedText: string
): Promise<{ transactions: ExtractedTransaction[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[AI] OPENAI_API_KEY não configurada")
    return { transactions: [] }
  }

  if (!extractedText || extractedText.length < 50) {
    console.error("[AI] Texto muito curto para processar")
    return { transactions: [] }
  }

  console.log("[AI] Enviando " + extractedText.length + " chars para GPT...")

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 16000,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "Extrato bancário:\n\n" + extractedText.slice(0, 50000) },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[AI] OpenAI erro " + res.status + ": " + err)
      return { transactions: [] }
    }

    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content ?? "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    console.log("[AI] Resposta recebida (" + content.length + " chars)")

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error("[AI] JSON inválido:", content.slice(0, 300))
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
    console.error("[AI] Erro:", error)
    return { transactions: [] }
  }
}
