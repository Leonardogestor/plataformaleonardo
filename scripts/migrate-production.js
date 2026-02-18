/**
 * Roda migrações no banco de PRODUÇÃO.
 * Uso: node scripts/migrate-production.js
 * Requer: variável de ambiente DATABASE_URL com a URL do Neon (produção).
 *
 * Este script NÃO carrega .env - use apenas DATABASE_URL no ambiente.
 * Exemplo PowerShell (uma linha):
 *   $env:DATABASE_URL="postgresql://usuario:senha@host/neondb?sslmode=require"; node scripts/migrate-production.js
 */
const { execSync } = require("child_process");
const path = require("path");

const url = process.env.DATABASE_URL;
if (!url || !url.startsWith("postgresql://")) {
  console.error("Defina DATABASE_URL com a connection string do Neon (produção).");
  process.exit(1);
}

// Rodar prisma migrate deploy sem carregar .env (env já vem do shell)
process.env.DATABASE_URL = url;
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
  env: { ...process.env, DATABASE_URL: url },
});
console.log("Migrações aplicadas com sucesso.");
