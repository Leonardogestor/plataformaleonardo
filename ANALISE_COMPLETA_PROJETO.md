# Análise completa do projeto Plataformaleo

**Data:** 18/02/2025  
**Escopo:** Estrutura do projeto, Pluggy, Vercel, Open Finance, PDF, CSV, interligação de dados e telas.

---

## 1. Estrutura do projeto (pasta a pasta)

| Pasta | Função |
|-------|--------|
| **`app`** | Next.js App Router: páginas e API (monólito front + backend). |
| **`app/(dashboard)/`** | Área logada: dashboard, accounts, budget, cards, categorization, documents, goals, investments, planning, projections, reports, settings, transactions, transactions/import. |
| **`app/api/`** | Route Handlers: auth, accounts, transactions, open-finance, pluggy, documents, export, budget, cards, goals, investments, planning, projections, reports, dashboard, webhooks/kiwify, etc. |
| **`components`** | Componentes React (accounts, dashboard, transactions, UI, etc.). |
| **`lib`** | Lógica compartilhada: auth, db, pluggy, document-extract, parse-ofx, dashboard-queries, reports, goals-analytics, etc. |
| **`hooks`** | Hooks React. |
| **`prisma`** | Schema, migrations e seed (PostgreSQL). |
| **`scripts`** | Scripts (ngrok, neon-keep-alive). |
| **`types`** | Definições TypeScript. |
| **`__tests__`** | Testes. |

**Configuração:** `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `.env.example`, `.env.production`.  
**Não existe** `vercel.json` na raiz; o deploy na Vercel usa o padrão do Next.js.

---

## 2. Pluggy – conexão e uso

### Status: **funcionando** (depende de env e da API Pluggy)

- **Variáveis:** `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` (obrigatórias). Opcional: `PLUGGY_BASE_URL`, `PLUGGY_WEBHOOK_SECRET`.
- **Cliente:** `lib/pluggy.ts` – autenticação (`getPluggyToken`), `createConnectToken`, `getPluggyAccounts`, `getPluggyTransactions`, `getPluggyItemStatus`, `listPluggyConnectors`, `validatePluggyWebhookSignature`.
- **Rotas que usam Pluggy:**
  - `app/api/pluggy/connect/route.ts` – gera connect token (API Pluggy).
  - `app/api/open-finance/connect/route.ts` – usa `createConnectToken(session.user.id)` e retorna `accessToken` para o widget.
  - `app/api/open-finance/callback/route.ts` – recebe `itemId`, busca contas e transações na Pluggy, persiste `BankConnection`, `Account` e `Transaction` (provider `PLUGGY`).
  - `app/api/open-finance/sync/route.ts` – sincroniza transações e saldos por `connectionId` usando as mesmas funções do `lib/pluggy.ts`.

### Pontos de atenção

1. **Webhook Pluggy:** A documentação (ex.: OPEN_FINANCE.md) cita `POST /api/open-finance/webhook`. **Não existe** `app/api/open-finance/webhook/route.ts`. O `PLUGGY_WEBHOOK_SECRET` está no `.env.example`, mas não há handler. Eventos assíncronos do Pluggy (ex.: item desatualizado) não são tratados; a sincronização hoje é só sob demanda (botão “Sincronizar”).
2. **Token:** Cache em memória em `lib/pluggy.ts`; em serverless (Vercel) cada instância pode ter seu próprio cache, o que é aceitável.
3. **100%:** A integração está correta no código; “100%” depende de credenciais corretas no ambiente e da disponibilidade da API Pluggy.

---

## 3. Vercel – deploy e build

### Status: **configurado para funcionar**

- **Build:** Script `vercel-build` no `package.json`: `prisma generate && next build`.
- **Deploy:** Documentação em `DEPLOY.md`, `DEPLOY_GUIA_RAPIDO.md`, etc. Variáveis devem ser configuradas no dashboard da Vercel (DATABASE_URL, NEXTAUTH_*, PLUGGY_*, etc.).
- **`vercel.json`:** Não existe; o Next.js é detectado automaticamente.
- **Observação:** Upload de documentos grava em `uploads/documents/{userId}/`. Na Vercel o filesystem é efêmero; arquivos enviados **não persistem** entre deploys ou entre instâncias. Para produção com upload de PDF/arquivos, é recomendável usar armazenamento externo (ex.: S3, Vercel Blob).

---

## 4. Open Finance

### Status: **funcionando** (via Pluggy)

- Toda a experiência “Open Finance” é implementada com a **Pluggy** (conectar bancos, contas e transações).
- **Fluxo:**  
  1. Usuário abre o diálogo “Conectar banco” (`components/accounts/connect-bank-dialog.tsx`).  
  2. Front chama `POST /api/open-finance/connect` → recebe `accessToken`.  
  3. Widget Pluggy é aberto com esse token.  
  4. Após sucesso, front chama `POST /api/open-finance/callback` com `itemId`.  
  5. Backend busca contas e transações na Pluggy e persiste em `BankConnection`, `Account` e `Transaction`.  
  6. Evento `open-finance:connected` é disparado; dashboard e contas recarregam (ex.: `loadDashboard()`).
- **Sync manual:** Botão “Sincronizar” chama `POST /api/open-finance/sync` com `connectionId`; transações e saldos são atualizados.
- **Gap:** Não há rota de webhook para eventos Pluggy (item atualizado/erro etc.), então atualizações automáticas pós-conexão dependem do usuário clicar em “Sincronizar” ou da lógica que você adicionar (ex.: webhook).

---

## 5. Anexar PDF – análise e alimentação da plataforma

### O que existe hoje

- **Upload:** `app/api/documents/route.ts` (POST) aceita PDF (e Excel/imagens), salva em `uploads/documents/{userId}/`, cria registro em `Document`.
- **Extração de texto:** Após o upload, em background é chamado `extractTextFromFile` (`lib/document-extract.ts`). Para PDF usa `pdf-parse`; para Excel usa `xlsx`; para imagens usa `tesseract.js` (OCR). O resultado é salvo em `Document.extractedText`.
- **Rota sob demanda:** `app/api/documents/[id]/extract/route.ts` (POST) reexecuta a extração e atualiza `extractedText`.
- **Uso do texto:** O `extractedText` é usado para **busca/indexação** na listagem de documentos (GET `/api/documents?q=...`), não para criar transações ou outros dados financeiros.

### Resposta direta

- **Não existe hoje** análise de PDF que, a partir do conteúdo (ex.: extrato bancário), extraia transações ou outros dados e **alimente** a plataforma (contas, transações, orçamento, etc.).
- O PDF é armazenado e indexado por texto para **busca em documentos**; a plataforma **não** é alimentada automaticamente com base no conteúdo do PDF.
- Para “alimentar a plataforma com base no PDF do cliente” seria necessário um novo fluxo: por exemplo, parsing de extrato (PDF) → extração de linhas (data, valor, descrição) → criação de registros em `Transaction` (e eventualmente vínculo com `Account`), similar ao que já existe para CSV/OFX/Excel.

---

## 6. CSV – análise e alimentação da plataforma

### Status: **funcionando e interligado**

- **Frontend:**  
  - `app/(dashboard)/transactions/import/page.tsx` – upload de CSV (ou OFX/Excel via parse no servidor).  
  - `components/transactions/csv-upload.tsx` – aceita `.csv`, usa **Papa Parse** no cliente, chama `onUpload(data, headers)`.
- **Fluxo:** Upload CSV → preview → mapeamento de colunas (CsvMapping) → review (ReviewImport) → confirmação. Na confirmação o front envia **JSON** para `POST /api/transactions/import` (não envia o arquivo de novo).
- **Backend:** `app/api/transactions/import/route.ts` – valida o array de transações (Zod), persiste em `Transaction` e, quando há `accountId`, atualiza o saldo da conta (`balance` increment).
- **OFX/Excel:** `app/api/transactions/import/parse/route.ts` – POST com arquivo .ofx ou .xlsx/.xls; devolve dados parseados; o mesmo fluxo de mapeamento/review envia para `POST /api/transactions/import`.

Conclusão: os dados do CSV (e OFX/Excel) **alimentam** a base de transações e contas; as mesmas tabelas são usadas pelo dashboard, relatórios, orçamento, etc., ou seja, **a plataforma está alimentada e interligada** para esse fluxo.

---

## 7. Plataforma interligada – os dados alimentam todas as telas?

### Sim, para as fontes que gravam em `Account` e `Transaction`

Todas as telas abaixo consomem do mesmo banco (Prisma) e do mesmo `userId` (sessão):

| Tela / API | Fonte de dados |
|------------|-----------------|
| **Dashboard** | `GET /api/dashboard` → `lib/dashboard-queries.ts` (metrics a partir de `Account` + `Transaction`, categorias, evolução mensal, transações recentes, insights, risco, independência financeira). |
| **Contas** | `GET /api/accounts`, `GET /api/accounts/analytics` → Prisma `Account` (inclui contas vindas do Open Finance/Pluggy). |
| **Transações** | `GET /api/transactions` → Prisma `Transaction` (filtros por período, conta, etc.). |
| **Importação** | Persiste em `Transaction` (e atualiza `Account.balance` quando há `accountId`). |
| **Orçamento (Budget)** | `GET /api/budget?month=YYYY-MM` → `Budget` + `Transaction` do mês (comparação gasto vs orçamento por categoria). |
| **Metas (Goals)** | `GET /api/goals` → `Goal` + `GoalContribution`; progresso e valores podem usar contexto de saldo/transações. |
| **Relatórios** | `GET /api/reports` → `lib/reports.ts` (mensal/anual) usa `Transaction` e contas para totais, categorias, evolução. |
| **Exportação** | `GET /api/export` (CSV de transações, PDF/Excel de relatórios) lê as mesmas `Transaction`. |
| **Categorização** | Usa `Transaction` e regras de categorização. |
| **Projeções / Planejamento** | Podem usar `Transaction` e métricas do dashboard. |

Fluxos que **alimentam** essas telas:

1. **Open Finance (Pluggy):** callback e sync gravam em `BankConnection`, `Account` e `Transaction`.
2. **Importação CSV/OFX/Excel:** grava em `Transaction` e atualiza `Account.balance` quando há conta.
3. **Lançamentos manuais:** criação/edição via `POST/PATCH /api/transactions` e `Account` via `/api/accounts`.

Ou seja: **os dados que o cliente coloca (conexão bancária, importação CSV/OFX/Excel, lançamentos manuais) alimentam o dashboard, contas, transações, orçamento, relatórios, exportação e demais telas que dependem de transações e contas.**  
**Exceção:** documentos (PDF/Excel/imagem) em `/documents` só alimentam a **lista e busca de documentos**; não alimentam transações, contas nem outras telas financeiras.

---

## 8. Resumo executivo

| Item | Status | Observação |
|------|--------|------------|
| **Pluggy** | OK | Integração implementada; depende de env e API. Webhook não implementado. |
| **Vercel** | OK | Build e deploy configurados; upload em disco não persiste em serverless. |
| **Open Finance** | OK | Funciona via Pluggy (connect, callback, sync). Falta webhook para eventos Pluggy. |
| **PDF** | Parcial | Upload + extração de texto para busca. **Não** há análise que alimente transações/contas. |
| **CSV** | OK | Importação completa; dados alimentam transações e contas e todas as telas que as usam. |
| **Plataforma interligada** | Sim | Contas e transações (Open Finance, importação, manuais) alimentam dashboard, orçamento, relatórios, metas, etc. PDF só alimenta a área de documentos. |

---

## 9. Recomendações

1. **Webhook Pluggy:** Implementar `app/api/open-finance/webhook/route.ts` (ou equivalente), validar assinatura com `PLUGGY_WEBHOOK_SECRET` e, nos eventos de item atualizado, chamar a mesma lógica de sync (ou enfileirar job) para manter contas/transações atualizadas sem depender só do botão “Sincronizar”.
2. **PDF para transações:** Se desejado, criar fluxo específico: upload de extrato em PDF → parsing (data, valor, descrição) → criação em `Transaction` (e opcionalmente vínculo com `Account`), com revisão do usuário antes de persistir (similar ao CSV).
3. **Upload em produção (Vercel):** Trocar armazenamento de `uploads/` em disco por serviço persistente (ex.: Vercel Blob, S3) e ajustar `app/api/documents/route.ts` e leitura em `extract` para usar esse storage.
4. **Variáveis de produção:** Garantir na Vercel: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET` e, quando houver webhook, `PLUGGY_WEBHOOK_SECRET`.

---

*Documento gerado com base na análise do código do repositório.*
