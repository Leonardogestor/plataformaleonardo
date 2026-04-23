export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
}

export async function extractTransactionsFromPdfWithAI(
  extractedText: string
): Promise<{ transactions: ExtractedTransaction[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[AI] Sem OPENAI_API_KEY")
    return { transactions: [] }
  }
  if (!extractedText || extractedText.length < 50) {
    console.error("[AI] Texto vazio")
    return { transactions: [] }
  }

  console.log("[AI] Enviando " + extractedText.length + " chars para gpt-4o-mini")

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 16000,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: [
              "Você é especialista em extratos bancários brasileiros.",
              'Extraia TODAS as transações e retorne APENAS JSON: {"transactions":[{"date":"YYYY-MM-DD","description":"nome","amount":99.99,"type":"EXPENSE","category":"Alimentacao"}]}',
              "Regras:",
              "- Converta datas no formato DD/MM/YYYY para YYYY-MM-DD (ISO).",
              "- Interprete valores brasileiros: 1.234,56 = 1234.56.",
              "- Se o valor for débito (saída), amount deve ser negativo.",
              "- type: INCOME=entrada/recebido, EXPENSE=saída/compra/pagamento, TRANSFER=investimento/aplicação.",
              "- Ignore saldos, cabeçalhos e totais.",
              '- Se o extrato for do Santander e houver log de OCR, inclua um campo "ocrLog" com o texto bruto extraído.',
              "- Sempre retorne um array completo de transações extraídas.",
            ].join(" "),
          },
          { role: "user", content: "Extrato:\n\n" + extractedText.slice(0, 50000) },
        ],
      }),
    })

    if (!res.ok) {
      console.error("[AI] Erro:", res.status)
      return { transactions: [] }
    }

    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content ?? "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error("[AI] JSON invalido:", content.slice(0, 200))
      return { transactions: [] }
    }

    const transactions = (parsed.transactions ?? [])
      .filter((t: any) => t.date && t.amount && t.type)
      .map((t: any) => ({
        date: String(t.date).trim(),
        description: String(t.description ?? "Sem descricao").slice(0, 200),
        amount: Math.abs(Number(t.amount) || 0),
        type: (["INCOME", "EXPENSE", "TRANSFER"].includes(t.type) ? t.type : "EXPENSE") as
          | "INCOME"
          | "EXPENSE"
          | "TRANSFER",
        category: String(t.category ?? "Outros"),
      }))
      .filter((t: ExtractedTransaction) => t.amount > 0)

    console.log("[AI] " + transactions.length + " transacoes extraidas")
    return { transactions }
  } catch (e) {
    console.error("[AI] Erro:", e instanceof Error ? e.message : String(e))
    return { transactions: [] }
  }
}
