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

  console.log(`[AI] Processando ${extractedText.length} chars com gpt-4o-mini...`)

  const prompt = `Você é especialista em extratos bancários brasileiros.
Analise o texto abaixo e extraia TODAS as transações financeiras individuais.
Retorne APENAS um JSON válido no formato:
{"transactions":[{"date":"YYYY-MM-DD","description":"descrição","amount":99.99,"type":"EXPENSE","category":"Alimentação"}]}

Regras:
- type: INCOME=entrada/recebido/resgate, EXPENSE=saída/compra/pagamento/débito, TRANSFER=transferência entre contas/investimento
- amount: sempre número positivo, sem símbolo R$
- date: formato YYYY-MM-DD obrigatório
- category: Alimentação, Transporte, Saúde, Mercado, Lazer, Moradia, Transferência, Investimento, Receita, Outros
- Ignore linhas de saldo total, cabeçalhos e rodapés
- Inclua TODAS as transações sem exceção

Texto do extrato:
${extractedText.slice(0, 50000)}`

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 16000,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!res.ok) {
      console.error("[AI] Erro API:", res.status, await res.text())
      return { transactions: [] }
    }

    const data = await res.json()
    const content = (data.choices?.[0]?.message?.content ?? "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    console.log(`[AI] Resposta: ${content.length} chars`)

    const parsed = JSON.parse(content)
    const transactions: ExtractedTransaction[] = (parsed.transactions ?? [])
      .filter((t: any) => t.date && t.amount && t.type)
      .map((t: any) => ({
        date: String(t.date).trim(),
        description: String(t.description ?? "Sem descrição").slice(0, 200),
        amount: Math.abs(Number(t.amount) || 0),
        type: (["INCOME", "EXPENSE", "TRANSFER"].includes(t.type) ? t.type : "EXPENSE") as
          | "INCOME"
          | "EXPENSE"
          | "TRANSFER",
        category: String(t.category ?? "Outros"),
      }))
      .filter((t: ExtractedTransaction) => t.amount > 0)

    console.log(`[AI] ${transactions.length} transações extraídas`)
    return { transactions }
  } catch (e) {
    console.error("[AI] Erro:", e instanceof Error ? e.message : String(e))
    return { transactions: [] }
  }
}
