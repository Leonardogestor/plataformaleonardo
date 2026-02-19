/**
 * Vercel Blob storage for document storage.
 * Path pattern: documents/{userId}/{uuid}.pdf
 *
 * IMPORTANTE – Dados sensíveis (extratos):
 * - A URL do blob NUNCA é enviada ao cliente: o download é por proxy (stream). Isso mitiga vazamento.
 * - Mesmo assim, a URL continua PÚBLICA no storage. Se alguém descobrir (log, console, erro, interceptação),
 *   o link funciona. Está mitigado, não blindado.
 * - Correção real (quando possível): migrar para private + signed URL (Vercel) OU S3 bucket privado + presigned URL.
 * - Hoje: put() usa "public" por limitação do SDK; GET /api/documents/[id]/download faz proxy e não expõe a URL.
 */

import { put, del, head } from "@vercel/blob"

const PREFIX = "documents"

/** Max size 10MB for document uploads */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024

/**
 * Uploads a document to Blob storage.
 * Tenta access: "private" por conformidade; se o SDK não suportar, usa "public" e dependemos do proxy de download para não expor a URL.
 */
export async function uploadDocumentBlob(
  userId: string,
  pathnameSuffix: string,
  body: Buffer | Blob,
  options?: { contentType?: string }
): Promise<{ url: string; pathname: string; contentType?: string }> {
  const pathname = `${PREFIX}/${userId}/${pathnameSuffix}`
  const contentType = options?.contentType ?? "application/pdf"

  // SDK Vercel Blob hoje aceita apenas access: "public". A URL NUNCA é enviada ao cliente:
  // o download é feito por proxy (stream) em GET /api/documents/[id]/download.
  // Quando a Vercel suportar access: "private" e signed URL (ex: 60s), usar private aqui
  // e no download gerar signed URL ou continuar proxy com token.
  const blob = await put(pathname, body, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  })
  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType ?? undefined,
  }
}

/**
 * Deletes a blob by URL or pathname.
 */
export async function deleteDocumentBlob(urlOrPathname: string): Promise<void> {
  await del(urlOrPathname)
}

/**
 * Check if blob exists (by URL or pathname).
 */
export async function blobExists(urlOrPathname: string): Promise<boolean> {
  try {
    await head(urlOrPathname)
    return true
  } catch {
    return false
  }
}
