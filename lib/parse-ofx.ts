/**
 * Parser simples para OFX 1.x (SGML). Extrai transações de extratos bancários.
 * Formato esperado: blocos <STMTTRN> com DTPOSTED, TRNAMT, MEMO ou NAME.
 */
export interface OfxTransaction {
  date: string // YYYY-MM-DD
  amount: number
  description: string
  type: "INCOME" | "EXPENSE"
}

export function parseOfx(content: string): OfxTransaction[] {
  const results: OfxTransaction[] = []
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let block: RegExpExecArray | null
  while ((block = blockRegex.exec(content)) !== null) {
    const inner = block[1]
    if (!inner) continue
    const dateMatch = inner.match(/<DTPOSTED>(\d{8})/i)
    const amountMatch = inner.match(/<TRNAMT>([-\d,.]+)/i)
    const memoMatch = inner.match(/<(?:MEMO|NAME)>([^<]*)/i)

    const dateStr = dateMatch?.[1] ?? ""
    const amountStr = amountMatch?.[1]?.replace(",", ".") ?? "0"
    const description = (memoMatch?.[1]?.trim() ?? "").slice(0, 255) || "Sem descrição"

    if (!dateStr) continue

    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6)
    const day = dateStr.slice(6, 8)
    const date = `${year}-${month}-${day}`

    const amount = parseFloat(amountStr)
    if (Number.isNaN(amount)) continue

    results.push({
      date,
      amount: Math.abs(amount),
      description,
      type: amount >= 0 ? "INCOME" : "EXPENSE",
    })
  }
  return results
}
