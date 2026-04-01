# Guia de Deploy - LMG Platform

## 🚀 Deploy Local → Vercel

### Pré-requisitos

1. **Node.js 18+** instalado
2. **Vercel CLI** instalado: `npm i -g vercel`
3. **Conta Vercel** configurada

### 1. Configuração do Ambiente Local

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente locais
# Copiar .env.local.example para .env.local e preencher

# 3. Gerar Prisma Client
npx prisma generate

# 4. Rodar migrações do banco
npx prisma migrate dev

# 5. Iniciar desenvolvimento
npm run dev
```

### 2. Configuração do Ambiente Produção (Vercel)

#### Variáveis de Ambiente Necessárias:

```bash
# Autenticação
NEXTAUTH_URL=https://seu-dominio.vercel.app
NEXTAUTH_SECRET=sua-chave-secreta-32-chars

# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@host:porta/database?sslmode=require

# Features
DOCUMENT_PROCESSING_ENABLED=true
PDF_PROCESSING_ENABLED=true
NODE_ENV=production

# Open Finance (Opcional)
PLUGGY_CLIENT_ID=seu-client-id
PLUGGY_CLIENT_SECRET=seu-client-secret
```

#### Configurar via Vercel CLI:

```bash
# Fazer login na Vercel
vercel login

# Linkar projeto
vercel link

# Adicionar variáveis de ambiente
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add DATABASE_URL
vercel env add DOCUMENT_PROCESSING_ENABLED
vercel env add PDF_PROCESSING_ENABLED
```

### 3. Processo de Deploy

#### Opção 1: Via Script (Recomendado)

```bash
# Deploy para staging
npm run deploy:staging

# Deploy para produção
npm run deploy:prod
```

#### Opção 2: Manual

```bash
# Build do projeto
npm run build

# Deploy para staging
vercel

# Deploy para produção
vercel --prod
```

### 4. Verificação Pós-Deploy

1. **Testar autenticação**: Faça login/logout
2. **Testar upload de PDFs**: Verifique se os uploads funcionam
3. **Testar todas as páginas**: Dashboard, transações, investimentos
4. **Verificar console**: Sem erros 401 ou 500

### 5. Troubleshooting Comum

#### Erro 401 Unauthorized
- Verifique `NEXTAUTH_SECRET` e `NEXTAUTH_URL`
- Confira se as variáveis estão configuradas na Vercel
- Limpe cookies do navegador

#### Erro de Build
- Verifique se `prisma generate` está no pre-build
- Confira variáveis de ambiente de build
- Verifique versões do Node.js

#### Problemas com Banco
- Confira `DATABASE_URL` com SSL
- Verifique se migrações foram aplicadas
- Teste conexão localmente

### 6. Comandos Úteis

```bash
# Ver logs da Vercel
vercel logs

# Ver ambiente de produção
vercel env ls

# Fazer deploy de branch específico
vercel --prod --branch feature/nova-feature

# Remover deploy da produção
vercel rm --prod

# Verificar status do projeto
vercel inspect
```

### 7. Fluxo de Trabalho Recomendado

1. **Desenvolvimento Local**
   ```bash
   npm run dev
   ```

2. **Testes e Staging**
   ```bash
   git checkout -b feature/nova-funcionalidade
   # Desenvolver...
   git commit -m "feat: nova funcionalidade"
   git push origin feature/nova-funcionalidade
   npm run deploy:staging
   ```

3. **Produção**
   ```bash
   git checkout main
   git merge feature/nova-funcionalidade
   git push origin main
   npm run deploy:prod
   ```

### 8. Monitoramento

- **Dashboard Vercel**: https://vercel.com/dashboard
- **Analytics**: Métricas de uso e performance
- **Logs**: Erros e acessos em tempo real
- **Alertas**: Configurar notificações de erro

### 9. Backup e Segurança

- **Backup do banco**: Exportar regularmente
- **Variáveis de ambiente**: Manter seguras
- **SSL**: Automático na Vercel
- **Monitoramento**: Ativar alertas de segurança

---

## 📋 Checklist de Deploy

- [ ] Ambiente local funcionando
- [ ] Testes passando
- [ ] Variáveis de ambiente configuradas
- [ ] Build local bem-sucedido
- [ ] Deploy staging testado
- [ ] Produção atualizada
- [ ] Funcionalidades críticas testadas
- [ ] Monitoramento ativo

---

**URL Produção**: https://plataformalmg.vercel.app
**Repositório**: https://github.com/Leonardogestor/plataformaleonardo
