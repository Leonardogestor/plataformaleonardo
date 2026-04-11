-- Add missing columns to documents table that were in the schema but never migrated

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "extractedText" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "vencimentoAt" TIMESTAMP(3);
