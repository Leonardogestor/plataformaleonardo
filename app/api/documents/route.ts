import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { Prisma } from "@prisma/client"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"
import { extractTextFromFile } from "@/lib/document-extract"

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "documents")
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()

    const where: Prisma.DocumentWhereInput = {
      userId: session.user.id,
    }
    if (q && q.length >= 2) {
      const term = { contains: q, mode: "insensitive" as const }
      where.AND = [
        {
          OR: [
            { name: term },
            { fileName: term },
            ...(q.length <= 500 ? [{ extractedText: term }] : []),
          ],
        },
      ]
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Erro ao listar documentos:", error)
    return NextResponse.json({ error: "Erro ao listar documentos" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const name = (formData.get("name") as string) || "Documento"

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo 10MB." },
        { status: 400 }
      )
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "image/jpeg",
      "image/png",
    ]
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Tipo não permitido. Use PDF, Excel ou imagens." },
        { status: 400 }
      )
    }

    const userDir = path.join(UPLOAD_DIR, session.user.id)
    await mkdir(userDir, { recursive: true })

    const ext = path.extname(file.name) || ".bin"
    const fileId = crypto.randomBytes(8).toString("hex")
    const fileName = `${fileId}${ext}`
    const filePath = path.join(userDir, fileName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const relativePath = path.join("uploads", "documents", session.user.id, fileName)

    const doc = await prisma.document.create({
      data: {
        userId: session.user.id,
        name: name.trim() || file.name,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        filePath: relativePath,
      },
    })

    // Extração automática em background (OCR/PDF/Excel) para indexação e busca
    void (async () => {
      try {
        const text = await extractTextFromFile(buffer, file.type)
        if (text) {
          await prisma.document.update({
            where: { id: doc.id },
            data: { extractedText: text },
          })
        }
      } catch (e) {
        console.warn("Extração automática falhou para documento", doc.id, e)
      }
    })()

    return NextResponse.json(doc, { status: 201 })
  } catch (error) {
    console.error("Erro ao enviar documento:", error)
    return NextResponse.json({ error: "Erro ao enviar documento" }, { status: 500 })
  }
}
