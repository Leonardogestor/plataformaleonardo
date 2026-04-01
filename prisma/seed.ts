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

  console.log("✅ Novo usuário cliente criado")
  console.log(`   ID: ${client.id}`)
  console.log(`   Email: ${client.email}`)
  console.log(`   Nome: ${client.name}`)
  console.log(`   Role: ${client.role}`)

  console.log("\n🎉 Seed concluído com sucesso!")
  console.log("\n📧 Credenciais de acesso do cliente:")
  console.log("👤 Email: suportelmgconsultoria@gmail.com")
  console.log("🔑 Senha: Lmg@2026")
  console.log("\n� O usuário inicia com todos os dados zerados, pronto para preencher!")
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
