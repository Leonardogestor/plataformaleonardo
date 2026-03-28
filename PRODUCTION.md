# Variáveis de Ambiente - Produção

Este documento lista todas as variáveis de ambiente necessárias para rodar a LMG PLATAFORMA FINANCEIRA em produção.

## Variáveis Obrigatórias

### DATABASE_URL

**Descrição**: Connection string do banco de dados PostgreSQL

**Formato**:
```
postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
```

**Exemplos**:

**Neon**:
```
postgresql://usuario:senha@ep-cool-cloud-123456.us-east-2.aws.neon.tech/lmgplatform?sslmode=require
```

**Supabase**:
```
postgresql://postgres.abcdefghijk:[senha]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Onde obter**:
- **Neon**: Dashboard > Connection Details > Connection String
- **Supabase**: Settings > Database > Connection String (Transaction Mode, porta 5432)

---

### NEXTAUTH_URL

**Descrição**: URL pública da aplicação (necessário para NextAuth.js funcionar corretamente)

**Formato**:
```
https://seu-dominio.com
```

**Exemplos**:

**Vercel (domínio automático)**:
```
https://lmg-platform.vercel.app
```

**Domínio customizado**:
```
https://app.lmgfinance.com
```

**Importante**:
- DEVE usar HTTPS em produção
- NÃO incluir barra final `/`
- Deve ser exatamente a URL que os usuários acessam

**Como configurar**:
1. No primeiro deploy, use o domínio do Vercel (você receberá após o deploy)
2. Após receber o domínio, atualize esta variável no Vercel Dashboard
3. Faça redeploy (ou aguarde o próximo push)

---

### NEXTAUTH_SECRET

**Descrição**: Chave secreta para criptografia de JWT e cookies de sessão

**Requisitos**:
- Mínimo 32 caracteres
- Deve ser aleatória e única
- NUNCA reutilize entre ambientes (staging/production devem ter secrets diferentes)
- NUNCA commite no Git

**Como gerar**:

**Usando OpenSSL** (Linux/Mac/WSL):
```bash
openssl rand -base64 32
```

**Usando Node.js** (qualquer sistema):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Usando PowerShell** (Windows):
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Exemplo de output**:
```
K7jxQw3vR2mP9sL4nF8tY1uH5bC6xE0qW9aZ3dG7mJ2=
```

---

## Variáveis Opcionais

### NODE_ENV

**Descrição**: Ambiente de execução

**Valores aceitos**:
- `production` (recomendado para produção)
- `development` (apenas para desenvolvimento local)

**Padrão**: `production` (se não especificado)

**Exemplo**:
```
NODE_ENV="production"
```

---

### NEXTAUTH_DEBUG

**Descrição**: Habilita logs detalhados do NextAuth para debugging

**Valores aceitos**:
- `true` - Habilita logs detalhados
- `false` - Desabilita (padrão)

**Uso**: Apenas para debugging em staging/development

**Exemplo**:
```
NEXTAUTH_DEBUG=true
```

**⚠️ Atenção**: NÃO use em produção, pois pode expor informações sensíveis nos logs.

---

## Configuração no Vercel

### Via Dashboard

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em `Settings` > `Environment Variables`
4. Para cada variável:
   - **Key**: Nome da variável (ex: `DATABASE_URL`)
   - **Value**: Valor da variável
   - **Environment**: Selecione onde aplicar:
     - ✅ **Production** - Sempre marcar
     - ⚪ **Preview** - Marcar se quiser usar em deploys de preview
     - ⚪ **Development** - Geralmente não necessário
5. Clique em `Save`

### Via CLI

```bash
# Adicionar variável de produção
vercel env add DATABASE_URL production

# Listar variáveis
vercel env ls

# Remover variável
vercel env rm DATABASE_URL production
```

---

## Checklist de Configuração

Antes de fazer deploy em produção, verifique:

- [ ] `DATABASE_URL` está configurada e testada
- [ ] `NEXTAUTH_URL` aponta para o domínio correto (com HTTPS)
- [ ] `NEXTAUTH_SECRET` foi gerada aleatoriamente (32+ caracteres)
- [ ] `NODE_ENV` está definida como "production"
- [ ] Todas as variáveis estão marcadas para "Production" no Vercel
- [ ] Nenhuma variável sensível está commitada no Git
- [ ] Connection string do banco está usando SSL/TLS (`sslmode=require`)

---

## Exemplo Completo - Vercel Environment Variables

```bash
# Production Environment Variables

DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"
NEXTAUTH_URL="https://lmg-platform.vercel.app"
NEXTAUTH_SECRET="K7jxQw3vR2mP9sL4nF8tY1uH5bC6xE0qW9aZ3dG7mJ2="
NODE_ENV="production"
```

---

## Troubleshooting

### Erro: "Invalid `prisma.user.findUnique()`"

**Causa**: `DATABASE_URL` incorreta ou banco inacessível

**Solução**:
1. Verifique se a connection string está correta
2. Teste conexão localmente:
   ```bash
   npx prisma db pull
   ```
3. Verifique se o banco permite conexões externas (Neon/Supabase permitem por padrão)

### Erro: "[next-auth][error][JWT_SESSION_ERROR]"

**Causa**: `NEXTAUTH_SECRET` ausente ou `NEXTAUTH_URL` incorreta

**Solução**:
1. Verifique se `NEXTAUTH_SECRET` está configurada no Vercel
2. Confirme que `NEXTAUTH_URL` corresponde exatamente ao domínio acessado
3. Limpe cookies do navegador e tente novamente

### Erro: "ECONNREFUSED" ou "Timeout"

**Causa**: Banco de dados inacessível ou `DATABASE_URL` incorreta

**Solução**:
1. Verifique se a URL tem `sslmode=require`
2. Confirme que o host do banco está correto
3. Para Neon: Use a connection string no formato direto (não pooler)
4. Para Supabase: Use porta 5432 (Transaction mode), não 6543 (Session mode)

---

## Segurança

### Boas Práticas

1. **Nunca commite variáveis sensíveis no Git**
   - Use `.env.local` para desenvolvimento
   - `.env.example` deve ter valores placeholder

2. **Use secrets diferentes por ambiente**
   - Staging e Production devem ter `NEXTAUTH_SECRET` diferentes
   - Use databases separados

3. **Rotacione secrets periodicamente**
   - Troque `NEXTAUTH_SECRET` a cada 6-12 meses
   - Isso invalida todas as sessões ativas

4. **Restrinja acesso ao Vercel Dashboard**
   - Use autenticação de dois fatores
   - Limite quem tem acesso às environment variables

5. **Monitor logs para vazamentos**
   - Certifique-se de que variáveis não aparecem em logs
   - Use `NEXTAUTH_DEBUG=false` em produção

---

## Referências

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
- [Prisma Connection URLs](https://www.prisma.io/docs/reference/database-reference/connection-urls)
- [Neon Documentation](https://neon.tech/docs/introduction)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
