import { prisma } from "@/lib/db"
import { StandardTransactionInput } from "@/lib/parsers/parse"

export interface NormalizedTransactionInput {
  parsedId: string
  merchant: string
  category: string
  subcategory?: string
  standardizedDescription: string
  confidence: number
}

export interface NormalizeResult {
  success: boolean
  data?: NormalizedTransactionInput[]
  error?: string
}

// Dicionário local de categorização (cache)
const categoryDictionary = new Map<
  string,
  {
    merchant: string
    category: string
    subcategory?: string
    confidence: number
  }
>()

// Inicializar dicionário com categorias comuns
function initializeDictionary() {
  const commonCategories = [
    // Supermercados
    {
      pattern: "carrefour",
      merchant: "Carrefour",
      category: "Alimentação",
      subcategory: "Supermercado",
      confidence: 0.95,
    },
    {
      pattern: "pão de açúcar",
      merchant: "Pão de Açúcar",
      category: "Alimentação",
      subcategory: "Supermercado",
      confidence: 0.95,
    },
    {
      pattern: "extra",
      merchant: "Extra",
      category: "Alimentação",
      subcategory: "Supermercado",
      confidence: 0.9,
    },
    {
      pattern: "walmart",
      merchant: "Walmart",
      category: "Alimentação",
      subcategory: "Supermercado",
      confidence: 0.9,
    },

    // Restaurantes
    {
      pattern: "mcdonald",
      merchant: "McDonald's",
      category: "Alimentação",
      subcategory: "Restaurante",
      confidence: 0.95,
    },
    {
      pattern: "burger king",
      merchant: "Burger King",
      category: "Alimentação",
      subcategory: "Restaurante",
      confidence: 0.95,
    },
    {
      pattern: "habib",
      merchant: "Habib's",
      category: "Alimentação",
      subcategory: "Restaurante",
      confidence: 0.9,
    },
    {
      pattern: "pizza",
      merchant: "Pizzaria",
      category: "Alimentação",
      subcategory: "Restaurante",
      confidence: 0.85,
    },

    // Transporte
    {
      pattern: "uber",
      merchant: "Uber",
      category: "Transporte",
      subcategory: "App",
      confidence: 0.95,
    },
    { pattern: "99", merchant: "99", category: "Transporte", subcategory: "App", confidence: 0.95 },
    {
      pattern: "posto",
      merchant: "Posto",
      category: "Transporte",
      subcategory: "Combustível",
      confidence: 0.9,
    },
    {
      pattern: "petrobras",
      merchant: "Petrobras",
      category: "Transporte",
      subcategory: "Combustível",
      confidence: 0.9,
    },

    // Contas
    {
      pattern: "energia",
      merchant: "Companhia Energética",
      category: "Contas",
      subcategory: "Energia",
      confidence: 0.95,
    },
    {
      pattern: "água",
      merchant: "Companhia de Água",
      category: "Contas",
      subcategory: "Água",
      confidence: 0.95,
    },
    {
      pattern: "telefone",
      merchant: "Telefonia",
      category: "Contas",
      subcategory: "Telefone/Internet",
      confidence: 0.9,
    },
    {
      pattern: "net",
      merchant: "NET",
      category: "Contas",
      subcategory: "Telefone/Internet",
      confidence: 0.9,
    },
    {
      pattern: "vivo",
      merchant: "Vivo",
      category: "Contas",
      subcategory: "Telefone/Internet",
      confidence: 0.9,
    },
    {
      pattern: "claro",
      merchant: "Claro",
      category: "Contas",
      subcategory: "Telefone/Internet",
      confidence: 0.9,
    },
    {
      pattern: "oi",
      merchant: "Oi",
      category: "Contas",
      subcategory: "Telefone/Internet",
      confidence: 0.9,
    },

    // Streaming
    {
      pattern: "netflix",
      merchant: "Netflix",
      category: "Entretenimento",
      subcategory: "Streaming",
      confidence: 0.95,
    },
    {
      pattern: "spotify",
      merchant: "Spotify",
      category: "Entretenimento",
      subcategory: "Streaming",
      confidence: 0.95,
    },
    {
      pattern: "amazon prime",
      merchant: "Amazon Prime",
      category: "Entretenimento",
      subcategory: "Streaming",
      confidence: 0.95,
    },
    {
      pattern: "disney",
      merchant: "Disney+",
      category: "Entretenimento",
      subcategory: "Streaming",
      confidence: 0.95,
    },
    {
      pattern: "hbo",
      merchant: "HBO Max",
      category: "Entretenimento",
      subcategory: "Streaming",
      confidence: 0.9,
    },

    // Bancos
    {
      pattern: "itau",
      merchant: "Itaú",
      category: "Serviços Financeiros",
      subcategory: "Banco",
      confidence: 0.95,
    },
    {
      pattern: "bradesco",
      merchant: "Bradesco",
      category: "Serviços Financeiros",
      subcategory: "Banco",
      confidence: 0.95,
    },
    {
      pattern: "santander",
      merchant: "Santander",
      category: "Serviços Financeiros",
      subcategory: "Banco",
      confidence: 0.95,
    },
    {
      pattern: "caixa",
      merchant: "Caixa",
      category: "Serviços Financeiros",
      subcategory: "Banco",
      confidence: 0.95,
    },
    {
      pattern: "nubank",
      merchant: "Nubank",
      category: "Serviços Financeiros",
      subcategory: "Banco",
      confidence: 0.95,
    },
    {
      pattern: "inter",
      merchant: "Banco Inter",
      category: "Serviços Financeiros",
      subcategory: "Banco",
      confidence: 0.95,
    },

    // Farmácias
    {
      pattern: "drogaria",
      merchant: "Drogaria",
      category: "Saúde",
      subcategory: "Farmácia",
      confidence: 0.9,
    },
    {
      pattern: "farmácia",
      merchant: "Farmácia",
      category: "Saúde",
      subcategory: "Farmácia",
      confidence: 0.9,
    },
    {
      pattern: "panvel",
      merchant: "Panvel",
      category: "Saúde",
      subcategory: "Farmácia",
      confidence: 0.95,
    },
    {
      pattern: "drogasil",
      merchant: "Drogasil",
      category: "Saúde",
      subcategory: "Farmácia",
      confidence: 0.95,
    },

    // Varejo
    {
      pattern: "americanas",
      merchant: "Americanas",
      category: "Varejo",
      subcategory: "Loja",
      confidence: 0.95,
    },
    {
      pattern: "magazine",
      merchant: "Magazine Luiza",
      category: "Varejo",
      subcategory: "Loja",
      confidence: 0.95,
    },
    {
      pattern: "casas bahia",
      merchant: "Casas Bahia",
      category: "Varejo",
      subcategory: "Loja",
      confidence: 0.95,
    },
    {
      pattern: "riachuelo",
      merchant: "Riachuelo",
      category: "Varejo",
      subcategory: "Roupas",
      confidence: 0.9,
    },
    {
      pattern: "renner",
      merchant: "Renner",
      category: "Varejo",
      subcategory: "Roupas",
      confidence: 0.9,
    },
    { pattern: "c&a", merchant: "C&A", category: "Varejo", subcategory: "Roupas", confidence: 0.9 },

    // Educação
    {
      pattern: "escola",
      merchant: "Escola",
      category: "Educação",
      subcategory: "Mensalidade",
      confidence: 0.9,
    },
    {
      pattern: "faculdade",
      merchant: "Faculdade",
      category: "Educação",
      subcategory: "Mensalidade",
      confidence: 0.9,
    },
    {
      pattern: "curso",
      merchant: "Curso",
      category: "Educação",
      subcategory: "Curso",
      confidence: 0.85,
    },
    {
      pattern: "duolingo",
      merchant: "Duolingo",
      category: "Educação",
      subcategory: "App",
      confidence: 0.95,
    },

    // Saque/Transferência
    {
      pattern: "saque",
      merchant: "Saque",
      category: "Transferências",
      subcategory: "Saque",
      confidence: 0.95,
    },
    {
      pattern: "transfer",
      merchant: "Transferência",
      category: "Transferências",
      subcategory: "TED/DOC",
      confidence: 0.95,
    },
    {
      pattern: "pix",
      merchant: "PIX",
      category: "Transferências",
      subcategory: "PIX",
      confidence: 0.95,
    },
    {
      pattern: "depósito",
      merchant: "Depósito",
      category: "Transferências",
      subcategory: "Depósito",
      confidence: 0.95,
    },

    // Salário
    {
      pattern: "salário",
      merchant: "Salário",
      category: "Receitas",
      subcategory: "Salário",
      confidence: 0.95,
    },
    {
      pattern: "folha",
      merchant: "Folha de Pagamento",
      category: "Receitas",
      subcategory: "Salário",
      confidence: 0.95,
    },
    {
      pattern: "honorários",
      merchant: "Honorários",
      category: "Receitas",
      subcategory: "Profissional",
      confidence: 0.9,
    },
    {
      pattern: "freelance",
      merchant: "Freelance",
      category: "Receitas",
      subcategory: "Profissional",
      confidence: 0.9,
    },
  ]

  commonCategories.forEach((item) => {
    categoryDictionary.set(item.pattern.toLowerCase(), {
      merchant: item.merchant,
      category: item.category,
      subcategory: item.subcategory,
      confidence: item.confidence,
    })
  })
}

export async function normalizeTransactions(
  transactions: StandardTransactionInput[],
  userId: string
): Promise<NormalizeResult> {
  try {
    console.log(`[NORMALIZE] Normalizando ${transactions.length} transações`)

    // Inicializar dicionário se estiver vazio
    if (categoryDictionary.size === 0) {
      initializeDictionary()
    }

    const normalizedTransactions: NormalizedTransactionInput[] = []

    // Carregar regras personalizadas do usuário
    const userRules = await prisma.categoryRule.findMany({
      where: {
        userId,
        isActive: true,
      },
    })

    for (const transaction of transactions) {
      const normalized = await normalizeTransaction(transaction, userRules)
      if (normalized) {
        normalizedTransactions.push(normalized)
      }
    }

    // Salvar transações normalizadas no banco
    const savedTransactions = await Promise.all(
      normalizedTransactions.map(async (normalized) => {
        return await prisma.normalizedTransaction.create({
          data: {
            userId,
            parsedId: normalized.parsedId,
            merchant: normalized.merchant,
            category: normalized.category,
            subcategory: normalized.subcategory,
            standardizedDescription: normalized.standardizedDescription,
            confidence: normalized.confidence,
          },
        })
      })
    )

    console.log(`[NORMALIZE] ${savedTransactions.length} transações normalizadas salvas`)

    return {
      success: true,
      data: normalizedTransactions,
    }
  } catch (error) {
    console.error("[NORMALIZE] Erro na normalização:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function normalizeTransaction(
  transaction: StandardTransactionInput,
  userRules: any[]
): Promise<NormalizedTransactionInput | null> {
  try {
    const description = transaction.description.toLowerCase().trim()

    // 1. Verificar regras personalizadas do usuário primeiro
    for (const rule of userRules) {
      if (description.includes(rule.pattern.toLowerCase())) {
        const result: NormalizedTransactionInput = {
          parsedId: "", // Será preenchido depois
          merchant: extractMerchant(transaction.description),
          category: rule.category,
          subcategory: rule.conditionJson ? JSON.parse(rule.conditionJson).subcategory : undefined,
          standardizedDescription: standardizeDescription(transaction.description),
          confidence: 0.95,
        }

        // Atualizar contador de matches da regra
        await prisma.categoryRule.update({
          where: { id: rule.id },
          data: { matchCount: { increment: 1 } },
        })

        return result
      }
    }

    // 2. Verificar dicionário local
    for (const [pattern, categoryInfo] of categoryDictionary.entries()) {
      if (description.includes(pattern)) {
        return {
          parsedId: "", // Será preenchido depois
          merchant: categoryInfo.merchant,
          category: categoryInfo.category,
          subcategory: categoryInfo.subcategory,
          standardizedDescription: standardizeDescription(transaction.description),
          confidence: categoryInfo.confidence,
        }
      }
    }

    // 3. Se não encontrar, usar IA
    const aiResult = await categorizeWithAI(transaction.description)
    if (aiResult) {
      // Salvar no dicionário para aprendizado futuro
      const keyPattern = extractKeyPattern(transaction.description)
      if (keyPattern) {
        categoryDictionary.set(keyPattern.toLowerCase(), {
          merchant: aiResult.merchant,
          category: aiResult.category,
          subcategory: aiResult.subcategory,
          confidence: aiResult.confidence,
        })
      }

      return {
        parsedId: "", // Será preenchido depois
        merchant: aiResult.merchant,
        category: aiResult.category,
        subcategory: aiResult.subcategory,
        standardizedDescription: standardizeDescription(transaction.description),
        confidence: aiResult.confidence,
      }
    }

    // 4. Último recurso: categorização genérica
    return {
      parsedId: "", // Será preenchido depois
      merchant: extractMerchant(transaction.description),
      category: transaction.type === "INCOME" ? "Receitas" : "Despesas Não Classificadas",
      subcategory: transaction.type === "INCOME" ? "Outras" : "Outras",
      standardizedDescription: standardizeDescription(transaction.description),
      confidence: 0.3,
    }
  } catch (error) {
    console.error("[NORMALIZE] Erro ao normalizar transação:", error)
    return null
  }
}

async function categorizeWithAI(description: string): Promise<{
  merchant: string
  category: string
  subcategory?: string
  confidence: number
} | null> {
  try {
    // Verificar se tem OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.log("[NORMALIZE] OpenAI API key não configurada, usando fallback")
      return null
    }

    const prompt = `Você é um classificador financeiro especializado no mercado brasileiro.

Classifique a transação abaixo:

Descrição: "${description}"

Retorne APENAS um JSON neste formato exato:
{
  "merchant": "nome do estabelecimento",
  "category": "categoria principal",
  "subcategory": "subcategoria (opcional)",
  "confidence": 0.0-1.0
}

Categorias principais comuns: Alimentação, Transporte, Contas, Entretenimento, Serviços Financeiros, Saúde, Varejo, Educação, Transferências, Receitas, Despesas Não Classificadas.

Seja específico e preciso na classificação.`

    // Simulação de chamada IA (substituir com OpenAI real)
    // const response = await openai.chat.completions.create({
    //   model: "gpt-3.5-turbo",
    //   messages: [{ role: "user", content: prompt }],
    //   temperature: 0.1
    // })

    // Por enquanto, retorna null para usar fallback
    return null
  } catch (error) {
    console.error("[NORMALIZE] Erro na categorização com IA:", error)
    return null
  }
}

function extractMerchant(description: string): string {
  // Extrair nome do comerciante da descrição
  const words = description.split(" ").filter((word) => word.length > 2)

  // Tentar identificar o nome principal (primeiras palavras)
  if (words.length >= 2) {
    return words.slice(0, 2).join(" ")
  }

  return description.substring(0, 30).trim()
}

function standardizeDescription(description: string): string {
  // Padronizar descrição removendo caracteres especiais e normalizando
  return description
    .replace(/[^\w\s\-.,]/g, "") // Remover caracteres especiais
    .replace(/\s+/g, " ") // Normalizar espaços
    .trim()
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function extractKeyPattern(description: string): string | null {
  // Extrair padrão chave para cache
  const words = description
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 3)

  if (words.length >= 1) {
    // Retorna a palavra mais longa ou mais específica
    return words.reduce((longest, current) => (current.length > longest.length ? current : longest))
  }

  return null
}
