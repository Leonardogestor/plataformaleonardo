export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
}

export async function extractTransactionsFromPdfWithAI(
  pdfBuffer: Buffer
): Promise<{ transactions: ExtractedTransaction[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { transactions: [] }
  }

  const base64 = pdfBuffer.toString("base64")
  const prompt = [
    "Você é um especialista em extratos bancários brasileiros.",
    "Analise este extrato PDF do Nubank e extraia TODAS as transações individuais.",
    "Retorne APENAS um JSON válido, sem texto adicional, sem markdown, sem explicações.",
    "Formato obrigatório:",
    '{"transactions":[{"date":"YYYY-MM-DD","description":"nome do estabelecimento ou pessoa","amount":99.99,"type":"EXPENSE","category":"Alimentação"}]}',
    "Regras:",
    "- type deve ser EXPENSE para saídas/compras/transferências enviadas",
    "- type deve ser INCOME para entradas/transferências recebidas/resgates",
    "- type deve ser TRANSFER para investimentos",
    "- amount sempre positivo, sem R$",
    "- date no formato YYYY-MM-DD",
    "- Ignore linhas de total, saldo e cabeçalho",
    "- Inclua TODAS as transações do extrato",
  ].join("\n")

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: "extrato.pdf",
                file_data: "data:application/pdf;base64," + base64,
              },
              {
                type: "input_text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("[AI] Responses API erro " + res.status + ": " + errText)
      return { transactions: [] }
    }

    const data = await res.json()
    console.log("[AI] Resposta recebida, output blocks:", data.output?.length)

    const textBlock = (data.output || []).find((block: any) => block.type === "message")
    const rawContent = textBlock?.content?.[0]?.text ?? ""

    console.log("[AI] Conteúdo raw (200 chars):", rawContent.slice(0, 200))

    const clean = rawContent
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    let parsed: any
    try {
      parsed = JSON.parse(clean)
    } catch {
      console.error("[AI] JSON invalido:", clean.slice(0, 300))
      return { transactions: [] }
    }

    const transactions: ExtractedTransaction[] = (parsed.transactions ?? [])
      .filter((t: any) => t.date && t.amount && t.type)
      .map((t: any) => ({
        date: String(t.date),
        description: String(t.description ?? "Sem descricao").slice(0, 200),
        amount: Math.abs(Number(t.amount) || 0),
        type: (["INCOME", "EXPENSE", "TRANSFER"].includes(t.type)
          ? t.type
          : "EXPENSE") as ExtractedTransaction["type"],
        category: String(t.category ?? "Outros"),
      }))
      .filter((t: ExtractedTransaction) => t.amount > 0)

    console.log("[AI] " + transactions.length + " transacoes extraidas")
    return { transactions }
  } catch (e) {
    console.error("[AI] Erro geral:", e)
    return { transactions: [] }
  }
}
