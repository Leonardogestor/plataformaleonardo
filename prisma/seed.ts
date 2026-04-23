import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed para novo usuário cliente...")

  // Limpar todos os dados existentes para começar do zero
  console.log("🧹 Limpando todos os dados existentes...")
  await prisma.user.deleteMany({})
  await prisma.transaction.deleteMany({})
  await prisma.investmentMovement.deleteMany({})
  await prisma.document.deleteMany({})
  await prisma.syncLog.deleteMany({})
  await prisma.rawTransaction.deleteMany({})
  await prisma.parsedTransaction.deleteMany({})
  await prisma.normalizedTransaction.deleteMany({})
  await prisma.merchantMapping.deleteMany({})
  await prisma.categoryRule.deleteMany({})
  await prisma.financial_ledger.deleteMany({})
  await prisma.financial_snapshots.deleteMany({})
  console.log("✅ Todos os dados antigos removidos - sistema limpo")

  // Criar senha hash para o novo usuário cliente
  const clientPassword = await bcrypt.hash("Lmg@2026", 10)

  // Criar novo usuário cliente
  const client = await prisma.user.create({
    data: {
      email: "suportelmgconsultoria@gmail.com",
      name: "Cliente LMG Consultoria",
      password: clientPassword,
      role: "USER",
    },
  })

  // Criar contas e transações de teste coerentes com a planilha
  const conta = await prisma.account.create({
    data: {
      userId: client.id,
      name: "Conta Corrente",
      balance: 10000,
    },
  })

  await prisma.transaction.createMany({
    data: [
      {
        userId: client.id,
        amount: 5000,
        type: "INCOME",
        category: "Salário",
        date: new Date(new Date().setMonth(new Date().getMonth() - 2)),
        description: "Salário Março",
        status: "green",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: client.id,
        amount: -2000,
        type: "EXPENSE",
        category: "Aluguel",
        date: new Date(new Date().setMonth(new Date().getMonth() - 2)),
        description: "Aluguel Março",
        status: "green",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: client.id,
        amount: 5000,
        type: "INCOME",
        category: "Salário",
        date: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        description: "Salário Abril",
        status: "green",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: client.id,
        amount: -2000,
        type: "EXPENSE",
        category: "Aluguel",
        date: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        description: "Aluguel Abril",
        status: "green",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: client.id,
        amount: 5000,
        type: "INCOME",
        category: "Salário",
        date: new Date(),
        description: "Salário Maio",
        status: "green",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: client.id,
        amount: -2000,
        type: "EXPENSE",
        category: "Aluguel",
        date: new Date(),
        description: "Aluguel Maio",
        status: "green",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  })

  console.log("✅ Novo usuário cliente criado")
  console.log(`   ID: ${client.id}`)
  console.log(`   Email: ${client.email}`)
  console.log(`   Nome: ${client.name}`)
  console.log(`   Role: ${client.role}`)

  console.log("\n🎉 Seed concluído com sucesso!")
  console.log("\n📧 Credenciais de acesso do cliente:")
  console.log("👤 Email: suportelmgconsultoria@gmail.com")
  console.log("🔑 Senha: Lmg@2026")
  console.log("\nO usuário inicia com dados de teste coerentes com a planilha!")
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
