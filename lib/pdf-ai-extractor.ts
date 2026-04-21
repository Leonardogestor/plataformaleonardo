export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
}

const SYSTEM_PROMPT = `Você é especialista em extratos bancários brasileiros.
Analise o extrato PDF e extraia TODAS as transações individuais.
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
  pdfBuffer: Buffer
): Promise<{ transactions: ExtractedTransaction[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error("[AI] OPENAI_API_KEY não configurada")
    return { transactions: [] }
  }

  try {
    console.log("[AI] Fazendo upload do PDF para OpenAI Files API...")

    const formData = new FormData()
    const blob = new Blob([pdfBuffer], { type: "application/pdf" })
    formData.append("file", blob, "extrato.pdf")
    formData.append("purpose", "assistants")

    const uploadRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey },
      body: formData,
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error("[AI] Erro no upload:", uploadRes.status, err)
      return await extractWithBase64(pdfBuffer, apiKey)
    }

    const uploadData = await uploadRes.json()
    const fileId = uploadData.id
    console.log("[AI] PDF enviado, file_id:", fileId)

    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 16000,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extraia todas as transações deste extrato e retorne o JSON." },
              { type: "file", file: { file_id: fileId } },
            ],
          },
        ],
      }),
    })

    fetch("https://api.openai.com/v1/files/" + fileId, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + apiKey },
    }).catch(() => {})

    if (!chatRes.ok) {
      console.error("[AI] Files API falhou, tentando fallback...")
      return await extractWithBase64(pdfBuffer, apiKey)
    }

    const chatData = await chatRes.json()
    const content = (chatData.choices?.[0]?.message?.content ?? "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error("[AI] JSON inválido, tentando fallback...")
      return await extractWithBase64(pdfBuffer, apiKey)
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

    console.log("[AI] " + transactions.length + " transações via Files API")
    return { transactions }
  } catch (error) {
    console.error("[AI] Erro, tentando fallback:", error)
    return await extractWithBase64(pdfBuffer, apiKey)
  }
}

async function extractWithBase64(
  pdfBuffer: Buffer,
  apiKey: string
): Promise<{ transactions: ExtractedTransaction[] }> {
  try {
    console.log("[AI] Fallback: Responses API + base64...")
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
                text: SYSTEM_PROMPT + "\n\nExtraia todas as transações e retorne o JSON.",
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      console.error("[AI] Fallback falhou:", res.status)
      return { transactions: [] }
    }

    const data = await res.json()
    const textBlock = (data.output ?? []).find((b: any) => b.type === "message")
    const content = (textBlock?.content?.[0]?.text ?? "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    const parsed = JSON.parse(content)
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

    console.log("[AI] " + transactions.length + " transações via fallback")
    return { transactions }
  } catch (e) {
    console.error("[AI] Fallback falhou:", e)
    return { transactions: [] }
  }
}
