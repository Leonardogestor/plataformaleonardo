export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
}

const SYSTEM_PROMPT = `Você é especialista em extratos bancários brasileiros. Analise o extrato PDF e extraia TODAS as transações individuais. Retorne APENAS JSON válido, sem texto adicional, sem markdown, sem explicações. Formato obrigatório: {"transactions":[{"date":"YYYY-MM-DD","description":"nome","amount":99.99,"type":"EXPENSE","category":"Alimentação"}]}. Regras: EXPENSE=saída/compra/transferência enviada, INCOME=entrada/transferência recebida/resgate, TRANSFER=investimento/aplicação. amount sempre positivo sem R$. Ignore saldos totais e cabeçalhos. Inclua TODAS as transações.`

export async function extractTransactionsFromPdfWithAI(
  pdfBuffer: Buffer
): Promise<{ transactions: ExtractedTransaction[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[AI] OPENAI_API_KEY não configurada")
    return { transactions: [] }
  }

  try {
    console.log("[AI] Enviando PDF para Responses API...")
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
                text: SYSTEM_PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[AI] Responses API erro " + res.status + ": " + err)
      return { transactions: [] }
    }

    const data = await res.json()
    console.log("[AI] output blocks:", JSON.stringify(data.output?.map((b: any) => b.type)))

    // Lê o texto da resposta — percorre todos os blocks procurando texto
    let rawText = ""
    for (const block of data.output ?? []) {
      if (block.type === "message") {
        for (const part of block.content ?? []) {
          if (part.type === "output_text" || part.type === "text") {
            rawText += part.text ?? ""
          }
        }
      }
      // Alguns modelos retornam diretamente
      if (block.type === "text") {
        rawText += block.text ?? ""
      }
    }

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
