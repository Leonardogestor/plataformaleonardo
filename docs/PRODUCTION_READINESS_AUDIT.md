# Production-readiness audit (final)

Auditoria de segurança e consistência antes da entrega. **Não** altera arquitetura; apenas verificação.

---

## PASS (confirmado)

| Item | Verificação |
|------|-------------|
| **Webhook valida HMAC** | `app/api/open-finance/webhook/route.ts`: lê `rawBody` com `request.text()`, obtém header `x-pluggy-signature`, usa `validatePluggyWebhookSignature(rawBody, signature, secret)` antes de processar. Retorna 401 se inválido. |
| **Lock sempre liberado** | `lib/pluggy-sync.ts`: bloco `finally` chama `prisma.bankConnection.updateMany({ where: { itemId }, data: { isSyncing: false } })`. Executa em sucesso, em `return` antecipado e em `catch`. |
| **Sync incremental (1 dia, 00:00 UTC)** | `getSyncFromDate(lastSyncAt)`: se `lastSyncAt` existe, subtrai 1 dia e aplica `setUTCHours(0,0,0,0)`. Sem `lastSyncAt` usa 90 dias atrás também em 00:00 UTC. |
| **Upsert evita duplicata Pluggy** | `syncItemTransactions`: `prisma.transaction.upsert({ where: { externalTransactionId: pluggyId }, ... })`. Pluggy id é único por transação. |
| **Upsert evita duplicata PDF** | `importTransactionsFromPdfWithDedup`: usa `pdfTransactionExternalId(userId, date, amount, description)` → `pdf:${sha256(...)}` e `upsert` por `externalTransactionId`. |
| **Hash PDF determinístico** | `pdfTransactionExternalId`: `userId|date.trim()|String(Number(amount))|description.trim().slice(0,500)` → sha256. Mesmos inputs → mesmo id. |
| **Rate limit 429** | `checkDocumentsLimit` / `checkSyncLimit`: quando `success === false` retorna `{ limited: true, retryAfter }`. Rotas de documents e sync retornam 429 com header `Retry-After`. |
| **Watchdog marca PROCESSING antigo como FAILED** | `app/api/cron/watchdog-documents/route.ts`: `updateMany` com `where: { status: "PROCESSING", updatedAt: { lt: cutoff } }`, `data: { status: "FAILED", errorMessage: "Processing timeout (watchdog)" }`. |
| **Sem uso de filesystem local para documentos** | Nenhum `readFile`, `writeFile`, `unlink` ou `/uploads` em `app/api` ou `lib` para fluxo de documentos. (Apenas `mobile/scripts` usa `writeFile` em script separado.) |
| **Logs sem dados sensíveis** | Logs estruturados usam apenas `documentId`, `itemId`, `durationMs`, `transactionsProcessed`, `status`, `error` (mensagem). Nenhum token, secret, `rawBody` ou conteúdo bruto de PDF. |
| **Acesso por userId** | Rotas de API que tocam dados do usuário usam `getServerSession` e filtram por `userId: session.user.id` ou `where: { id, userId: session.user.id }`. Webhook não usa sessão; sync carrega `BankConnection` por `itemId` e usa `connection.userId`. |
| **externalTransactionId único** | `prisma/schema.prisma`: `Transaction.externalTransactionId String? @unique`. |
| **SyncLog com índices** | `@@index([itemId])`, `@@index([documentId])`, `@@index([createdAt])`. |
| **Document com índice userId + status** | `@@index([userId])`, `@@index([userId, status])`. |
| **Índices em userId nas tabelas principais** | Transaction, Account, BankConnection, Document, Goal, etc. possuem índice em `userId` onde aplicável. |

---

## WARNINGS (não bloqueiam, mas devem ser tratados)

| Item | Risco | Recomendação |
|------|--------|----------------|
| **validatePluggyWebhookSignature e tamanho do buffer** | `crypto.timingSafeEqual` lança se os dois buffers tiverem tamanhos diferentes. Assinatura malformada (ex.: hex com tamanho errado) pode resultar em exceção não tratada e resposta 500 em vez de 401. | Em `lib/pluggy.ts`, antes de `timingSafeEqual`: comparar `Buffer.from(signature).length === Buffer.from(expected).length`; se diferente, retornar `false`. Ou envolver em try/catch e retornar false no catch. |
| **Log de email no auth** | `lib/auth.ts`: `console.log` com `credentials?.email` e `user.email` em tentativas de login. PII em log. | Reduzir ou remover logs de produção; ou usar apenas nível de evento (ex.: "login attempt") sem email. |
| **Rota legada /api/pluggy/connect** | `app/api/pluggy/connect/route.ts`: não usa sessão; usa `clientUserId: "user@lmg.com"` fixo e envia client secret no header para a Pluggy. A aplicação real usa `/api/open-finance/connect`. | Se não for usada, remover a rota. Se for mantida (ex.: teste interno), proteger com auth ou flag e nunca expor em produção. |
| **Processamento em background sem fila** | `processDocumentPdf` e webhook sync são fire-and-forget. Em pico (muitos PDFs ou webhooks), funções podem ser encerradas antes de terminar. | Já mitigado por watchdog (documentos) e lock (sync). Para escala maior, considerar fila (QStash, worker). |
| **Rate limit inativo sem Redis** | Sem `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`, `checkDocumentsLimit`/`checkSyncLimit` retornam `{ limited: false }`. | Documentado; em produção é obrigatório configurar Redis para ativar limite. |

---

## CRITICAL (corrigir antes da entrega)

| Item | Problema | Ação |
|------|----------|------|
| **Rota `/api/pluggy/connect` sem auth e com clientUserId fixo** | Qualquer um pode chamar POST e obter um connect token da Pluggy associado ao usuário fixo `"user@lmg.com"`. Se esse usuário existir, uma conexão bancária pode ser vinculada à conta errada. Além disso, a rota expõe o fluxo de token. | **Remover** `app/api/pluggy/connect/route.ts` **ou** torná-la inacessível em produção (ex.: checar `process.env.NODE_ENV === "development"` e retornar 404 em produção). A aplicação já usa apenas `/api/open-finance/connect` (com sessão). |

---

## Riscos de produção (resumo)

| Risco | Severidade | Estado |
|-------|------------|--------|
| Serverless: função encerrada antes do fim do sync/PDF | Mitigado | Watchdog (documentos) e lock (sync); possível perda pontual sem fila. |
| Erro não tratado em webhook (ex.: assinatura com tamanho errado) | Baixo | Pode gerar 500; tratar tamanho da assinatura em `validatePluggyWebhookSignature` (warning acima). |
| Lock não liberado | Nenhum | `finally` sempre executa. |
| Vazamento de memória por cache (Pluggy token) | Baixo | Cache em módulo; em serverless instâncias são efêmeras. |
| Timeout em fetch do blob (download proxy) | Médio | Nenhum timeout explícito em `fetch(doc.fileUrl)`; blob lento pode travar a requisição. Opcional: `AbortController` com timeout. |
| Await faltando | Nenhum | Background: `void (async () => { await syncItemTransactions(...) })()` e `processDocumentPdf(...).catch(...)` são intencionais (fire-and-forget). |
| Transição de status inconsistente | Nenhum | Document: PROCESSING → COMPLETED/FAILED. Watchdog: PROCESSING → FAILED. SyncLog sempre atualizado com finishedAt e status. |

---

## Prisma – índices e unique

- **Transaction:** `externalTransactionId String? @unique` (índice único implícito); `@@index([userId])`, `@@index([accountId])`, `@@index([date])`.
- **Document:** `@@index([userId])`, `@@index([userId, status])`, `@@index([userId, vencimentoAt])`.
- **SyncLog:** `@@index([itemId])`, `@@index([documentId])`, `@@index([createdAt])`.
- **BankConnection:** `itemId @unique`, `@@index([userId])`, `@@index([itemId])`, `@@index([itemId, isSyncing])`.

Nenhum índice obrigatório faltando para o uso atual.

---

## Conclusão

- **Entregável** após tratar o item **CRITICAL** (rota `/api/pluggy/connect`).
- **Recomendado** tratar os **WARNINGS** (assinatura com tamanho diferente, logs de auth, rota pluggy/connect removida ou protegida) e garantir Redis + cron watchdog em produção.
