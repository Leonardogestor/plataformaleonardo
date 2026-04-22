/**
 * Teste real da API de upload de PDF
 */

import fs from "fs"

async function testApiUpload() {
  try {
    console.log("🚀 TESTANDO UPLOAD REAL VIA API")

    // 1. Ler arquivo PDF
    const pdfPath = "C:\\Users\\vyrat\\Downloads\\NU_722116738_01SET2025_18SET2025.pdf"
    const fileBuffer = fs.readFileSync(pdfPath)
    const fileName = "NU_722116738_01SET2025_18SET2025.pdf"

    console.log(`📄 Arquivo: ${fileName} (${fileBuffer.length} bytes)`)

    // 2. Criar FormData manualmente para Node.js
    const boundary = "----formdata-node-" + Math.random().toString(16)
    let formData = ""

    formData += `--${boundary}\r\n`
    formData += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`
    formData += `Content-Type: application/pdf\r\n\r\n`

    const formDataBuffer = Buffer.concat([
      Buffer.from(formData, "utf8"),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
    ])

    // 3. Enviar para API
    console.log("📡 Enviando para /api/documents...")

    const response = await fetch("http://localhost:3000/api/documents", {
      method: "POST",
      body: formDataBuffer,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": formDataBuffer.length.toString(),
      },
    })

    console.log(`📊 Status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erro na API:", errorText)
      return
    }

    const result = await response.json()
    console.log("✅ Resposta da API:", JSON.stringify(result, null, 2))

    // 4. Verificar se o documento foi criado
    if (result.documents && result.documents.length > 0) {
      const docId = result.documents[0].id
      console.log(`📋 Documento criado: ${docId}`)

      // 5. Aguardar um pouco e verificar o status
      console.log("⏳ Aguardando processamento...")
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // 6. Verificar status do documento
      const statusResponse = await fetch(`http://localhost:3000/api/documents/${docId}`)
      if (statusResponse.ok) {
        const docStatus = await statusResponse.json()
        console.log("📊 Status do documento:", docStatus)
      }
    }
  } catch (error) {
    console.error("❌ Erro no teste:", error)
  }
}

// Verificar se o servidor está rodando
async function checkServer() {
  try {
    const response = await fetch("http://localhost:3000/api/health")
    if (response.ok) {
      console.log("✅ Servidor está rodando")
      return true
    }
  } catch (error) {
    console.error("❌ Servidor não está rodando:", error)
    console.log("💡 Inicie o servidor com: npm run dev")
    return false
  }
}

async function main() {
  const serverRunning = await checkServer()
  if (!serverRunning) {
    return
  }

  await testApiUpload()
}

main()
