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

  const prompt = "Extraia todas as transacoes bancarias deste extrato e retorne APENAS JSON: {\"transactions\":[{\"date\":\"YYYY-MM-DD\",\"description\":\"nome\",\"amount\":99.99,\"type\":\"EXPENSE\",\"category\":\"Outros\"}]}. EXPENSE=saida, INCOME=entrada, TRANSFER=investimento. amount positivo sem R$."

  try {
    // Envia o PDF diretamente como base64 para o GPT-4o via Responses API
    const base64 = pdfBuffer.toString("base64")

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
      const err = await res.text()
      console.error("[AI] OpenAI erro " + res.status + ": " + err)
      return { transactions: [] }
    }

    const data = await res.json()
    const content = (data.output?.[0]?.content?.[0]?.text ?? "")
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

    const transactions: ExtractedTransaction[] = (parsed.transactions ?? [])
      .filter((t: any) => t.date && t.amount && t.type)
      .map((t: any) => ({
        date: String(t.date),
        description: String(t.description ?? "Sem descricao").slice(0, 200),
        amount: Math.abs(Number(t.amount) || 0),
        type: (["INCOME", "EXPENSE", "TRANSFER"].includes(t.type) ? t.type : "EXPENSE") as ExtractedTransaction["type"],
        category: String(t.category ?? "Outros"),
      }))
      .filter((t: ExtractedTransaction) => t.amount > 0)

    console.log("[AI] " + transactions.length + " transacoes extraidas")
    return { transactions }
  } catch (e) {
    console.error("[AI] Erro:", e)
    return { transactions: [] }
  }
}
