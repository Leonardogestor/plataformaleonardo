// Teste do fluxo de upload de arquivos
const fs = require("fs")
const path = require("path")

// Criar um PDF de teste simples
const createTestPDF = () => {
  const testContent = `
BANCO NUBANK
Extrato de Conta Corrente
Período: 01/01/2026 a 31/01/2026

Data      Descrição            Valor
15/01/26  Salário              5.000,00
16/01/26  Supermercado ABC     -350,75
17/01/26  Aluguel Apartamento -1.200,00
18/01/26  Uber Viagem          -45,50
19/01/26  Investimento CDB     1.000,00
20/01/26  Restaurante XYZ      -120,00
21/01/26  Farmácia             -85,30
22/01/26  Streaming            -49,90
23/01/26  Academia             -150,00
24/01/26  Transferência        500,00

Saldo Final: 4.498,55
`

  // Salvar como arquivo de texto para simular PDF
  const filePath = path.join(__dirname, "test-extract.txt")
  fs.writeFileSync(filePath, testContent, "utf8")
  console.log("Arquivo de teste criado:", filePath)
  return filePath
}

// Testar upload via API
const testUploadAPI = async (filePath) => {
  const FormData = require("form-data")
  const form = new FormData()

  form.append("file", fs.createReadStream(filePath))
  form.append("name", "Extrato Nubank - Janeiro 2026")

  try {
    // Primeiro fazer login para obter cookie de sessão
    const loginResponse = await fetch("http://localhost:3001/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email: "test@example.com",
        password: "123456",
        csrfToken: "test-csrf-token", // Em produção, precisa obter o CSRF token real
        redirect: "false",
      }),
    })

    if (!loginResponse.ok) {
      console.error("Erro no login:", await loginResponse.text())
      return null
    }

    // Extrair cookies do login
    const setCookieHeader = loginResponse.headers.get("set-cookie")
    const cookies = setCookieHeader ? setCookieHeader.split(";")[0] : ""

    // Fazer upload com cookies
    const response = await fetch("http://localhost:3001/api/documents", {
      method: "POST",
      body: form,
      headers: {
        ...form.getHeaders(),
        Cookie: cookies,
      },
    })

    if (response.ok) {
      const result = await response.json()
      console.log("Upload bem-sucedido:", result)
      return result
    } else {
      const error = await response.json()
      console.error("Erro no upload:", error)
      return null
    }
  } catch (error) {
    console.error("Erro na requisição:", error)
    return null
  }
}

// Verificar status do processamento
const checkProcessingStatus = async (documentId) => {
  try {
    // Fazer login para obter cookie
    const loginResponse = await fetch("http://localhost:3001/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email: "test@example.com",
        password: "123456",
        csrfToken: "test-csrf-token",
        redirect: "false",
      }),
    })

    if (!loginResponse.ok) {
      console.error("Erro no login:", await loginResponse.text())
      return null
    }

    const setCookieHeader = loginResponse.headers.get("set-cookie")
    const cookies = setCookieHeader ? setCookieHeader.split(";")[0] : ""

    const response = await fetch(`http://localhost:3001/api/documents/${documentId}`, {
      headers: {
        Cookie: cookies,
      },
    })

    if (response.ok) {
      const result = await response.json()
      console.log("Status do documento:", {
        id: result.id,
        status: result.status,
        transactionCount: result.transactionCount,
        errorMessage: result.errorMessage,
      })
      return result
    } else {
      console.error("Erro ao verificar status:", await response.text())
      return null
    }
  } catch (error) {
    console.error("Erro na verificação:", error)
    return null
  }
}

// Executar testes
const runTests = async () => {
  console.log("=== Iniciando Testes de Upload ===\n")

  // 1. Criar arquivo de teste
  const filePath = createTestPDF()

  // 2. Fazer upload
  console.log("\n1. Fazendo upload...")
  const uploadResult = await testUploadAPI(filePath)

  if (uploadResult) {
    // 3. Verificar status após alguns segundos
    console.log("\n2. Aguardando processamento...")
    await new Promise((resolve) => setTimeout(resolve, 3000))

    console.log("\n3. Verificando status...")
    const status = await checkProcessingStatus(uploadResult.id)

    if (status && status.status === "COMPLETED") {
      console.log("\n✅ Upload e processamento concluídos com sucesso!")
    } else if (status && status.status === "PROCESSING") {
      console.log("\n⏳ Ainda processando...")
    } else {
      console.log("\n❌ Falha no processamento")
    }
  }

  // Limpar arquivo de teste
  fs.unlinkSync(filePath)
  console.log("\nArquivo de teste removido.")
}

runTests().catch(console.error)
