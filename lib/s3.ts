import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET_NAME!

export async function uploadToS3(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  console.log(`[S3] Enviando ${key} (${buffer.length} bytes)`)
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  )
  console.log(`[S3] Upload concluido: ${key}`)
  return key
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    console.log(`[S3] Arquivo deletado: ${key}`)
  } catch (e) {
    console.error("[S3] Erro ao deletar:", e)
  }
}

export async function getS3SignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  return getSignedUrl(s3, command, { expiresIn: 3600 })
}
