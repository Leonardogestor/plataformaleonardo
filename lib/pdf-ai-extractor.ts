export interface ExtractedTransaction {
  date: string
  description: string
  amount: number
  type: "INCOME" | "EXPENSE" | "TRANSFER"
  category: string
}

const SYSTEM_PROMPT = `Você é um especialista em extratos bancários brasileiros.
Analise o texto do extrato e extraia TODAS as transações financeiras.

Retorne APENAS um JSON válido com este formato exato, sem texto adicional:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Nome limpo do estabelecimento",
      "amount": 99.99,
      "type": "EXPENSE",
      "category": "Alimentação"
    }
  ]
}

Regras:
- type EXPENSE = saída (compras, pagamentos, Pix enviado)
- type INCOME = entrada (depósitos, Pix recebido, salário)
- type TRANSFER = aplicação ou resgate de investimento
- amount sempre positivo, sem R$
- description limpa, sem "Compra no débito", "pelo Pix", etc.
- date formato YYYY-MM-DD
- category: Alimentação, Transporte, Saúde, Mercado, Lazer, Moradia, Transferência, Investimento, Outros
- Ignore saldos, cabeçalhos, rodapés e totais por período
- Inclua TODAS as transações`

export async function extractTransactionsFromPdfWithAI(
  pdfBuffer: Buffer
): Promise<{ transactions: ExtractedTransaction[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn("[AI Extractor] OPENAI_API_KEY não configurada")
    return { transactions: [] }
  }

  try {
    let rawText = ""
    try {
      const mod = await import("pdf-parse")
      if (typeof mod.default === "function") {
        const data = await mod.default(pdfBuffer)
        rawText = data.text ?? ""
      } else if ((mod as any).PDFParse) {
        const parser = new (mod as any).PDFParse()
        const data = await parser.pdf(pdfBuffer)
        rawText = data.text ?? ""
      }
    } catch (e) {
      console.warn("[AI Extractor] pdf-parse falhou, usando buffer direto")
      rawText = pdfBuffer.toString("utf-8")
    }

    if (!rawText || rawText.trim().length < 50) {
      console.warn("[AI Extractor] Texto muito curto")
      return { transactions: [] }
    }

    const processedText = rawText
      .replace(/(\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+\d{4})/gi, "\n$1\n")
      .replace(/(Total de (?:entradas|saídas))/gi, "\n$1\n")
      .replace(/(Compra no débito|pelo Pix|Transferência enviada|Transferência recebida|via NuPay)/gi, "\n$1")
      .replace(/\n{3,}/g, "\n\n")
      .slice(0, 50000)

    console.log(`[AI Extractor] Enviando ${processedText.length} chars para GPT-4o-mini...`)

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 16000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extraia todas as transações deste extrato bancário:\n\n${processedText}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI error ${response.status}: ${await response.text()}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ""

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(cleaned)

    const transactions: ExtractedTransaction[] = (parsed.transactions ?? [])
      .filter((t: any) => t.date && t.amount && t.type)
      .map((t: any) => ({
        date: String(t.date),
        description: String(t.description ?? "Sem descrição").slice(0, 200),
        amount: Math.abs(Number(t.amount) || 0),
        type: (["INCOME", "EXPENSE", "TRANSFER"].includes(t.type) ? t.type : "EXPENSE") as ExtractedTransaction["type"],
        category: String(t.category ?? "Outros"),
      }))
      .filter((t: ExtractedTransaction) => t.amount > 0)

    console.log(`[AI Extractor] ✅ ${transactions.length} transações extraídas`)
    return { transactions }
  } catch (error) {
    console.error("[AI Extractor] Erro:", error)
    return { transactions: [] }
  }
}
