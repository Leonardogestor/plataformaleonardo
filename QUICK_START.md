# 🚀 Comandos Rápidos - LMG PLATAFORMA FINANCEIRA

## Setup Inicial (Uma Vez)

```bash
# Setup completo automático
npm run setup

# Ou passo a passo:
npm install              # Instala dependências
npm run db:generate      # Gera Prisma Client
npm run db:migrate       # Cria tabelas
npm run db:seed          # Popula dados
```

## Desenvolvimento Diário

```bash
# Iniciar servidor
npm run dev              # http://localhost:3000

# Ver banco de dados (GUI)
npm run db:studio        # http://localhost:5555
```

## Banco de Dados

```bash
# Criar migration
npm run db:migrate       # Cria e aplica migration

# Apenas atualizar schema (sem migration)
npm run db:push

# Resetar banco e recriar tudo
npm run db:reset

# Popular com dados de teste
npm run db:seed

# Gerar Prisma Client (após mudar schema)
npm run db:generate
```

## Build e Produção

```bash
# Build de produção
npm run build

# Rodar build localmente
npm run start

# Lint
npm run lint
```

## Troubleshooting

```bash
# Limpar e reinstalar
rm -rf node_modules package-lock.json
npm install

# Resetar Prisma
rm -rf node_modules/.prisma
npm run db:generate

# Matar porta 3000
npx kill-port 3000

# Limpar cache do Next
rm -rf .next
```

## Git

```bash
# Setup inicial
git init
git add .
git commit -m "feat: initial commit - LMG PLATAFORMA FINANCEIRA MVP"

# Workflow
git add .
git commit -m "feat: adiciona CRUD de transações"
git push origin main
```

## Docker (PostgreSQL)

```bash
# Iniciar
docker run --name lmg-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=lmg_platform \
  -p 5432:5432 \
  -d postgres:15

# Parar
docker stop lmg-postgres

# Iniciar novamente
docker start lmg-postgres

# Ver logs
docker logs lmg-postgres

# Remover
docker rm -f lmg-postgres
```

## Prisma Útil

```bash
# Ver schema formatado
npx prisma format

# Validar schema
npx prisma validate

# Abrir Studio
npx prisma studio

# Ver SQL da migration
cat prisma/migrations/*/migration.sql
```

## Credenciais de Teste

```
Admin:
  Email: admin@lmg.com
  Senha: admin123

Usuário:
  Email: user@lmg.com
  Senha: user123
```

## URLs Importantes

```
App:              http://localhost:3000
Prisma Studio:    http://localhost:5555
Login:            http://localhost:3000/login
Dashboard:        http://localhost:3000/dashboard
```

## Atalhos do VS Code

```
Ctrl + Shift + P   → Command Palette
Ctrl + `           → Terminal
Ctrl + B           → Toggle Sidebar
F5                 → Debug
Ctrl + P           → Quick Open
```

## Estrutura Rápida

```
app/
  (dashboard)/     → Páginas protegidas
  api/             → API Routes
  login/           → Autenticação
components/
  ui/              → Componentes base
  dashboard/       → Componentes do dashboard
lib/
  auth.ts          → Config NextAuth
  db.ts            → Prisma Client
prisma/
  schema.prisma    → Database schema
  seed.ts          → Dados de exemplo
```

## Próximos Passos

1. ✅ Rodar `npm run dev`
2. ✅ Acessar http://localhost:3000
3. ✅ Login: user@lmg.com / user123
4. ✅ Explorar Dashboard
5. ✅ Testar CRUD de Contas

**Bom desenvolvimento! 🎉**
