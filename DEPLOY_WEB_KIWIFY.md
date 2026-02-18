# Publicar a plataforma 100% na web + integração Kiwify

Este guia reúne: **como publicar a Leo na web** e **como vincular à Kiwify** para criar login exclusivo para quem comprar.

---

## Parte 1: Publicar 100% na web (Vercel + Neon)

Você já usa **Neon** (PostgreSQL) e o projeto está pronto para **Vercel**. Segue o passo a passo.

### 1. Conta e repositório

1. Crie uma conta em [vercel.com](https://vercel.com) (ou use a existente).
2. Suba o projeto para o **GitHub** (se ainda não estiver):
   - No terminal: `git add .` → `git commit -m "Deploy"` → `git push origin main`.
3. No Vercel: **Add New Project** → **Import** do repositório do GitHub.

### 2. Variáveis de ambiente no Vercel

No projeto no Vercel, vá em **Settings → Environment Variables** e adicione:

| Nome | Valor | Observação |
|------|--------|------------|
| `DATABASE_URL` | A connection string do **Neon** (Produção) | Igual ao que você usa no `.env` para produção |
| `NEXTAUTH_URL` | `https://seu-dominio.vercel.app` | Troque pelo domínio real **depois** do primeiro deploy |
| `NEXTAUTH_SECRET` | Uma string aleatória forte (mín. 32 caracteres) | Ex: `openssl rand -base64 32` |

Opcional (para Kiwify):

| Nome | Valor |
|------|--------|
| `KIWIFY_WEBHOOK_SECRET` | Um segredo que você inventar (ex: uma senha longa) |
| `KIWIFY_TEMP_PASSWORD` | Senha temporária para novos clientes (ex: `Alterar@123`) |

### 3. Build no Vercel

- **Build Command:** deixe o padrão ou use: `prisma generate && next build`
- **Output:** Next.js (detectado automaticamente).
- O script `vercel-build` no `package.json` já faz: `prisma generate && prisma migrate deploy && next build`. Se quiser rodar migrações no deploy, use como comando de build: `npm run vercel-build`.

### 4. Depois do primeiro deploy

1. Copie a URL do projeto (ex: `https://plataformaleo.vercel.app`).
2. Em **Settings → Environment Variables**, edite `NEXTAUTH_URL` e coloque exatamente essa URL (com `https://`).
3. Faça um **Redeploy** para aplicar.

### 5. Se não abrir localmente antes de publicar

- **Porta:** o Next.js usa a 3000. Rode: `npm run dev` e acesse `http://localhost:3000`.
- **.env:** confira se existem `DATABASE_URL`, `NEXTAUTH_URL` e `NEXTAUTH_SECRET` no `.env` na raiz do projeto.
- **Node:** use Node 18+ (recomendado 20). No terminal: `node -v`.

---

## Parte 2: Kiwify – login exclusivo para o cliente

Quando uma **compra for aprovada** na Kiwify, a plataforma pode chamar nossa API e **criar automaticamente** a conta do cliente na Leo.

### 1. URL do webhook

Com a aplicação no ar (Vercel), a URL do webhook será:

```text
https://SEU-DOMINIO.vercel.app/api/webhooks/kiwify
```

Substitua `SEU-DOMINIO` pelo domínio real do projeto (ex: `plataformaleo`).

### 2. Configurar na Kiwify

1. Acesse a Kiwify → **Apps** → **Webhooks**.
2. Clique em **Criar Webhook**.
3. **URL:** cole `https://SEU-DOMINIO.vercel.app/api/webhooks/kiwify`.
4. **Produto:** escolha o produto que dá acesso à plataforma (ou “todos”).
5. **Evento:** selecione **Compra aprovada** (ou equivalente que envia dados do comprador).
6. Salve.

Se você definiu `KIWIFY_WEBHOOK_SECRET` no Vercel, pode enviar esse mesmo valor em um header para a Kiwify (se ela permitir headers customizados) ou usar na URL:  
`https://SEU-DOMINIO.vercel.app/api/webhooks/kiwify?secret=SEU_KIWIFY_WEBHOOK_SECRET`.  
A API valida o `secret` na query ou no header `X-Kiwify-Secret`.

### 3. O que a API faz

- Recebe o POST da Kiwify (payload JSON).
- Extrai **email** e **nome** do comprador (campos comuns: `email`, `customer_email`, `name`, `customer_name`, ou dentro de `customer`).
- Se o **email já existir** na Leo: responde sucesso e não cria outra conta.
- Se não existir: **cria um usuário** com:
  - **Senha temporária:** valor de `KIWIFY_TEMP_PASSWORD` (ex: `Alterar@123`) ou a padrão usada no código.

### 4. O que o cliente precisa fazer

O cliente compra na Kiwify e a conta é criada na hora. Você precisa informar a ele:

- **URL de acesso:** `https://SEU-DOMINIO.vercel.app/login`
- **E-mail:** o mesmo usado na compra.
- **Senha temporária:** a que você definiu em `KIWIFY_TEMP_PASSWORD` (ex: “Alterar@123 – altere após o primeiro acesso”).

Você pode:

- Configurar um **e-mail automático** na Kiwify (ou em outra ferramenta) com esse link e a senha temporária, ou  
- Enviar manualmente por WhatsApp/e-mail após a compra.

---

## Resumo rápido

| Etapa | O que fazer |
|-------|-------------|
| Publicar na web | Repo no GitHub → Vercel → configurar `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` → deploy → ajustar `NEXTAUTH_URL` e redeploy. |
| Kiwify | Apps → Webhooks → URL `.../api/webhooks/kiwify` → evento “Compra aprovada” → definir senha temporária em `KIWIFY_TEMP_PASSWORD`. |
| Cliente | Acessa o link de login, usa e-mail da compra e a senha temporária; depois pode trocar a senha nas configurações (quando existir fluxo de “alterar senha”). |

---

## Documentos (upload) em produção

Na **Vercel**, o sistema de arquivos é efêmero: arquivos enviados na pasta `uploads` **não são persistentes** entre deploys e entre funções. Para produção:

- **Opção 1:** Usar um storage externo (ex: **Vercel Blob**, **AWS S3**) e alterar a API de documentos para salvar e servir arquivos desse storage.
- **Opção 2:** Por enquanto, a funcionalidade de **Documentos** pode ser usada em ambiente local ou em um host que tenha disco persistente (ex: Railway); em deploy só na Vercel, considere desativar ou avisar que uploads não serão guardados até integrar um storage.

Assim você consegue **publicar 100% na web** e, ao mesmo tempo, **oferecer login exclusivo para clientes da Kiwify** usando o webhook.
