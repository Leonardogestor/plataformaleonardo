// Classe central de projeções financeiras
// Utilitário para calcular idade a partir da data de nascimento (YYYY-MM-DD)
export function calcularIdade(dataNascimento: string): number {
  const hoje = new Date()
  const nascimento = new Date(dataNascimento)
  let idade = hoje.getFullYear() - nascimento.getFullYear()
  const m = hoje.getMonth() - nascimento.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--
  }
  return idade
}

// Regra dos 4%: calcula patrimônio necessário
export function calcularPatrimonioNecessario(despesaAnual: number): number {
  return despesaAnual / 0.04
}

// Juros compostos para projeção de patrimônio
export function calcularEvolucaoPatrimonial({
  patrimonioAtual,
  aporteMensal,
  taxaJurosMensal,
  meses,
}: {
  patrimonioAtual: number
  aporteMensal: number
  taxaJurosMensal: number
  meses: number
}): number[] {
  const resultados = []
  let P = patrimonioAtual
  for (let n = 1; n <= meses; n++) {
    P = P * (1 + taxaJurosMensal) + aporteMensal
    resultados.push(P)
  }
  return resultados
}

// Função principal de projeção
export class ProjectionsEngine {
  /**
   * Calcula projeções para diferentes cenários
   * @param meses Quantidade de meses
   * @param params { patrimonioAtual, aporteMensal, taxaJurosMensal, idade, despesasMensais }
   */
  static calcularProjecao(meses: number, params: any) {
    const {
      patrimonioAtual = 0,
      aporteMensal = 0,
      taxaJurosMensal = 0.004,
      idade = 30,
      despesasMensais = 0,
    } = params || {}

    // Projeção de patrimônio mês a mês
    const patrimonio = calcularEvolucaoPatrimonial({
      patrimonioAtual,
      aporteMensal,
      taxaJurosMensal,
      meses,
    })

    // Patrimônio necessário pela regra dos 4%
    const despesaAnual = despesasMensais * 12
    const patrimonioNecessario = calcularPatrimonioNecessario(despesaAnual)

    // Idade de aposentadoria estimada
    let idadeAposentadoria = null
    for (let i = 0; i < patrimonio.length; i++) {
      if ((patrimonio[i] ?? 0) >= patrimonioNecessario) {
        idadeAposentadoria = idade + i / 12
        break
      }
    }

    return Array.from({ length: meses }, (_, i) => ({
      mes: i + 1,
      ano: new Date().getFullYear() + Math.floor((i + new Date().getMonth()) / 12),
      patrimonio: patrimonio[i],
      patrimonioNecessario,
      idade: idade + i / 12,
      idadeAposentadoria,
      despesasMensais,
      aporteMensal,
      taxaJurosMensal,
    }))
  }

  // Função para updateProjections usando transações reais
  static updateProjections({
    patrimonioAtual,
    transacoes,
    taxaJurosMensal,
    meses,
    idade,
    despesasMensais,
  }: {
    patrimonioAtual: number
    transacoes: any[]
    taxaJurosMensal: number
    meses: number
    idade: number
    despesasMensais: number
  }) {
    // Calcular aporte real: média dos investimentos positivos do período
    const investimentos = transacoes.filter((t) => t.type === "investment" && Number(t.amount) > 0)
    const aporteMensal =
      investimentos.length > 0
        ? investimentos.reduce((sum, t) => sum + Number(t.amount), 0) / investimentos.length
        : 0

    return ProjectionsEngine.calcularProjecao(meses, {
      patrimonioAtual,
      aporteMensal,
      taxaJurosMensal,
      idade,
      despesasMensais,
    })
  }
}
