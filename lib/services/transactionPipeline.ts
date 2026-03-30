import { z } from "zod"
import { prisma } from "@/lib/db"
import { extractRaw } from "@/lib/parsers/extract"
import { parseRaw } from "@/lib/parsers/parse"
import { normalizeTransactions } from "@/lib/services/normalize"
import { persistTransactions } from "@/lib/services/persist"

const FileSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number().max(10 * 1024 * 1024), // 10MB
})

const SupportedTypes = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export interface PipelineResult {
  success: boolean
  processed: number
  errors: string[]
  warnings: string[]
  transactions?: any[]
}

export async function processDocument(file: File, userId: string): Promise<PipelineResult> {
  const result: PipelineResult = {
    success: false,
    processed: 0,
    errors: [],
    warnings: [],
  }

  try {
    // Validar arquivo
    const fileValidation = FileSchema.safeParse({
      name: file.name,
      type: file.type,
      size: file.size,
    })

    if (!fileValidation.success) {
      result.errors.push("Arquivo inválido: " + fileValidation.error.message)
      return result
    }

    if (!SupportedTypes.includes(file.type)) {
      result.errors.push(`Tipo de arquivo não suportado: ${file.type}`)
      return result
    }

    console.log(
      `[PIPELINE] Iniciando processamento do arquivo: ${file.name} para usuário: ${userId}`
    )

    // Camada 1: RAW - Extração dos dados brutos
    const raw = await extractRaw(file, userId)
    if (!raw.success) {
      result.errors.push("Falha na extração dos dados brutos: " + raw.error)
      return result
    }

    console.log(`[PIPELINE] Camada RAW concluída. ID: ${raw.data?.id}`)

    // Camada 2: PARSED - Estruturação dos dados
    const parsed = await parseRaw(raw.data!, userId)
    if (!parsed.success) {
      result.errors.push("Falha no parsing dos dados: " + parsed.error)
      return result
    }

    console.log(`[PIPELINE] Camada PARSED concluída. ${parsed.data?.length} transações processadas`)

    if (parsed.data!.length === 0) {
      result.warnings.push("Nenhuma transação encontrada no arquivo")
      result.success = true
      return result
    }

    // Camada 3: NORMALIZED - Inteligência e categorização
    const normalized = await normalizeTransactions(parsed.data!, userId)
    if (!normalized.success) {
      result.errors.push("Falha na normalização dos dados: " + normalized.error)
      return result
    }

    console.log(`[PIPELINE] Camada NORMALIZED concluída.`)

    // Camada 4: PERSIST - Salvamento final
    const persisted = await persistTransactions(normalized.data!, userId)
    if (!persisted.success) {
      result.errors.push("Falha na persistência dos dados: " + persisted.error)
      return result
    }

    console.log(`[PIPELINE] Camada PERSIST concluída. ${persisted.data?.length} transações salvas`)

    result.success = true
    result.processed = persisted.data!.length
    result.transactions = persisted.data

    // Adicionar warnings se houver transações com baixa confiança
    const lowConfidence = normalized.data!.filter((n) => n.confidence < 0.7)
    if (lowConfidence.length > 0) {
      result.warnings.push(
        `${lowConfidence.length} transações com baixa confiança na categorização (revisão recomendada)`
      )
    }

    return result
  } catch (error) {
    console.error("[PIPELINE] Erro inesperado:", error)
    result.errors.push(
      "Erro interno no processamento: " + (error instanceof Error ? error.message : String(error))
    )
    return result
  }
}

export async function getPipelineStatus(userId: string) {
  const stats = await prisma.rawTransaction.groupBy({
    by: ["source"],
    where: { userId },
    _count: true,
  })

  const recent = await prisma.rawTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      source: true,
      createdAt: true,
    },
  })

  return {
    stats,
    recent,
  }
}
