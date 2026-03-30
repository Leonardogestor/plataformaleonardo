import { prisma } from "@/lib/db"
import { extractMerchantKey } from "@/lib/utils/crypto"
import { pipelineLogger } from "@/lib/utils/logger"

export interface MerchantMappingResult {
  merchant: string
  category: string
  subcategory?: string
  confidence: number
  isExactMatch: boolean
}

/**
 * Busca mapeamento de merchant existente
 */
export async function findMerchantMapping(
  userId: string,
  description: string
): Promise<MerchantMappingResult | null> {
  try {
    const merchantKey = extractMerchantKey(description)

    // Busca exata primeiro
    const exactMatch = await prisma.merchantMapping.findFirst({
      where: {
        userId,
        rawDescription: description.toLowerCase().trim(),
      },
    })

    if (exactMatch) {
      pipelineLogger.debug("Exact merchant mapping found", {
        description,
        merchant: exactMatch.merchant,
      })

      return {
        merchant: exactMatch.merchant,
        category: exactMatch.category,
        subcategory: exactMatch.subcategory || undefined,
        confidence: exactMatch.confidence,
        isExactMatch: true,
      }
    }

    // Busca por chave (primeiras palavras)
    const keyMatch = await prisma.merchantMapping.findFirst({
      where: {
        userId,
        rawDescription: {
          contains: merchantKey,
        },
      },
    })

    if (keyMatch) {
      pipelineLogger.debug("Partial merchant mapping found", {
        description,
        merchantKey,
        merchant: keyMatch.merchant,
      })

      return {
        merchant: keyMatch.merchant,
        category: keyMatch.category,
        subcategory: keyMatch.subcategory || undefined,
        confidence: keyMatch.confidence * 0.8, // Reduz confiança por match parcial
        isExactMatch: false,
      }
    }

    return null
  } catch (error: any) {
    pipelineLogger.error("Error finding merchant mapping", {
      description,
      error: error.message,
    })
    return null
  }
}

/**
 * Cria novo mapeamento de merchant
 */
export async function createMerchantMapping(
  userId: string,
  rawDescription: string,
  merchant: string,
  category: string,
  subcategory?: string,
  confidence: number = 0.9
): Promise<void> {
  try {
    await prisma.merchantMapping.create({
      data: {
        userId,
        rawDescription: rawDescription.toLowerCase().trim(),
        merchant,
        category,
        subcategory,
        confidence,
      },
    })

    pipelineLogger.merchantMappingCreated(userId, rawDescription, merchant)
  } catch (error: any) {
    pipelineLogger.error("Error creating merchant mapping", {
      rawDescription,
      merchant,
      category,
      error: error.message,
    })
    throw error
  }
}

/**
 * Atualiza contador de uso de mapeamento
 */
export async function incrementMappingUsage(mappingId: string): Promise<void> {
  try {
    await prisma.merchantMapping.update({
      where: { id: mappingId },
      data: {
        usageCount: { increment: 1 },
        updatedAt: new Date(),
      },
    })
  } catch (error: unknown) {
    pipelineLogger.error("Error incrementing mapping usage", {
      mappingId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * Busca mapeamentos populares do usuário
 */
export async function getPopularMappings(userId: string, limit: number = 10): Promise<any[]> {
  try {
    return await prisma.merchantMapping.findMany({
      where: { userId },
      orderBy: { usageCount: "desc" },
      take: limit,
      select: {
        id: true,
        rawDescription: true,
        merchant: true,
        category: true,
        subcategory: true,
        usageCount: true,
        confidence: true,
      },
    })
  } catch (error: unknown) {
    pipelineLogger.error("Error getting popular mappings", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return []
  }
}

/**
 * Limpa mapeamentos antigos ou pouco usados
 */
export async function cleanupOldMappings(
  userId: string,
  daysThreshold: number = 90
): Promise<number> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold)

    const result = await prisma.merchantMapping.deleteMany({
      where: {
        userId,
        OR: [{ createdAt: { lt: cutoffDate } }, { usageCount: { lt: 2 } }],
      },
    })

    pipelineLogger.info("Old merchant mappings cleaned up", {
      userId,
      deletedCount: result.count,
      daysThreshold,
    })

    return result.count
  } catch (error: unknown) {
    pipelineLogger.error("Error cleaning up old mappings", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return 0
  }
}
