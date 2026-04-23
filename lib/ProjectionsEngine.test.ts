import { ProjectionsEngine } from "./ProjectionsEngine.ts"

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg)
}

try {
  // Teste 1: Salário
  const proj = ProjectionsEngine.calcularProjecao(1, {})[0]
  if (!proj) throw new Error("Projeção não gerada")
  assert(proj.receita?.valor === 5000, "Salário incorreto")
  assert(proj.despesas?.valor === 2000, "Despesa incorreta")
  assert(proj.investimento === 1000, "Investimento incorreto")
  assert(proj.resultado === 2000, "Resultado incorreto")
  assert(proj.taxaEconomia === 0.4, "Taxa economia incorreta")
  console.log("✅ PASSOU: Salário")

  // Teste 2: Eu Futuro
  const futuro = ProjectionsEngine.calcularProjecao(12, {})[11]
  if (!futuro) throw new Error("Projeção futura não gerada")
  assert(futuro.mes === 12, "Mês futuro incorreto")
  assert(futuro.ano === 2026, "Ano futuro incorreto")
  console.log("✅ PASSOU: Eu Futuro")

  // Teste 3: Projeção 2027
  const proj2027 = ProjectionsEngine.calcularProjecao(13, {})[12]
  if (!proj2027) throw new Error("Projeção 2027 não gerada")
  assert(proj2027.mes === 13, "Mês 13 incorreto")
  console.log("✅ PASSOU: Projeção 2027")

  // Teste 4: Estrutura dos campos
  assert(typeof proj.receita?.valor === "number", "Campo receita.valor não é number")
  assert(typeof proj.despesas?.valor === "number", "Campo despesas.valor não é number")
  assert(
    typeof proj.percentualInvestimento?.valor === "number",
    "Campo percentualInvestimento.valor não é number"
  )
  console.log("✅ PASSOU: Estrutura dos campos")

  // Teste 5: Todos os meses
  const todos = ProjectionsEngine.calcularProjecao(5, {})
  assert(todos.length === 5, "Quantidade de meses incorreta")
  console.log("✅ PASSOU: Todos os meses")

  console.log("\n✅✅✅ Todos os testes de integridade passaram!")
  process.exit(0)
} catch (e: any) {
  console.error("❌ FALHOU:", e.message)
  process.exit(1)
}
