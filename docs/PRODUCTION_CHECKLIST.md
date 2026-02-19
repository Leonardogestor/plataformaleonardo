# Checklist de produção – plataforma financeira

Sem os itens abaixo, a arquitetura implementada **não está ativa de verdade**.

**Antes de entregar:** rode a **verificação crítica final** em **~5 minutos** → [FINAL_VERIFICATION.md](./FINAL_VERIFICATION.md).

---

## 1. Variáveis de ambiente (obrigatórias)

Confirme em produção (ex.: Vercel → Project → Settings → Environment Variables):

| Variável | Uso |
|----------|-----|
| **DATABASE_URL** | PostgreSQL de produção (nunca use URL de dev/staging em prod). |
| **NEXTAUTH_URL** | URL pública do app (ex: `https://seu-dominio.vercel.app`). |
| **NEXTAUTH_SECRET** | Secret forte (ex: `openssl rand -base64 32`). |
| **PLUGGY_CLIENT_ID** | Dashboard Pluggy. |
| **PLUGGY_CLIENT_SECRET** | Dashboard Pluggy. |
| **PLUGGY_WEBHOOK_SECRET** | Assinatura do webhook Pluggy (item/updated). |
| **BLOB_READ_WRITE_TOKEN** | Vercel Blob store (upload/download de PDFs). |
| **CRON_SECRET** | Secret para chamar `/api/cron/watchdog-documents` (cron externo ou QStash). |
| **UPSTASH_REDIS_REST_URL** | Upstash Redis (rate limit por usuário). |
| **UPSTASH_REDIS_REST_TOKEN** | Upstash Redis. |

Sem **PLUGGY_WEBHOOK_SECRET**, o webhook não valida assinatura (inseguro).  
Sem **BLOB_READ_WRITE_TOKEN**, upload de documentos falha.  
Sem **CRON_SECRET**, o watchdog não executa (documentos podem ficar em PROCESSING para sempre).  
Sem **UPSTASH_***, o rate limit não é aplicado (sem backpressure).

---

## 2. Teste de ponta a ponta em produção

Rodar em **produção** (não só em dev):

### 2.1 Open Finance (Pluggy)

- [ ] Conectar banco (widget Pluggy).
- [ ] Verificar que um **evento webhook** é disparado (logs Pluggy ou seu log).
- [ ] Confirmar que o **sync** roda (contas e transações aparecem).
- [ ] Em **SyncLog**: existe registro com `itemId` preenchido, `status` COMPLETED, `transactionsProcessed` > 0.

### 2.2 PDF (upload e processamento)

- [ ] Upload de um PDF de extrato (banco suportado ou genérico).
- [ ] Documento fica com **status PROCESSING** logo após upload.
- [ ] Em **SyncLog**: existe registro com `documentId` preenchido.
- [ ] Após alguns segundos/minutos: **status** do documento vira **COMPLETED** e transações aparecem em Transações.
- [ ] **Reenvio do mesmo PDF** (ou reprocessar): **não duplica** transações (deduplicação por hash).

### 2.3 Watchdog (documentos “zumbi”)

- [ ] Forçar um documento a ficar em PROCESSING (ex.: criar registro em PROCESSING com `updatedAt` antigo, ou simular falha antes de atualizar status).
- [ ] Chamar o cron manualmente:  
  `GET https://seu-dominio/api/cron/watchdog-documents`  
  com `Authorization: Bearer <CRON_SECRET>` ou `?secret=<CRON_SECRET>`.
- [ ] Confirmar que o documento passou para **status FAILED** com `errorMessage` contendo “watchdog”.

Sem esse teste, você está **assumindo** que está funcionando.

---

## 3. Teste de rate limit

- [ ] **11 uploads de PDF** em menos de 1 minuto (mesmo usuário): o 11º deve retornar **429** e mensagem de limite. Header **Retry-After** presente.
- [ ] **11 syncs manuais** (Open Finance) em menos de 1 minuto: o 11º deve retornar **429**.

Requisito: **UPSTASH_REDIS_REST_URL** e **UPSTASH_REDIS_REST_TOKEN** configurados. Se não testar, você só “acha” que está protegido.

---

## 4. Índices no banco

O schema Prisma já define os índices abaixo. Após `prisma migrate deploy` (ou `db push`), confira no banco (ex.: `\di` no psql ou Prisma Studio):

| Tabela / uso | Índice |
|--------------|--------|
| Transações por id externo (Pluggy/PDF) | `Transaction.externalTransactionId` (@unique → índice). |
| Listagens por usuário | `Document.userId`, `Transaction.userId`, `Account.userId`, `BankConnection.userId`, etc. |
| Documentos por status | `Document`: `@@index([userId, status])`. |
| SyncLog por tempo | `SyncLog`: `@@index([createdAt])`. |

Sem índices adequados, a escala degrada (consultas lentas).

---

## 5. Backups (crítico)

Antes de cliente real:

- [ ] **Backup automático** do banco ativado? (ex.: Neon, Railway, Supabase, RDS.)
- [ ] **Frequência?** (ex.: diário, contínuo.)
- [ ] **Retenção?** (ex.: 7 dias, 30 dias.)
- [ ] Plano de **restore** testado?

Se não tiver backup configurado e testado, **não entregue** para uso real com dados financeiros.

---

## 6. Feature flag para PDF (recomendado)

Se o processamento de PDF quebrar, você consegue desativar sem derrubar a plataforma?

- **Variável:** `PDF_PROCESSING_ENABLED` (opcional).
- Se `PDF_PROCESSING_ENABLED=false`: o upload de PDF continua; o documento é criado em PROCESSING, mas o **processamento em background não é disparado**. Assim você desativa só o pipeline pesado (e pode reativar depois + “Reprocessar” nos documentos).
- Implementado em `app/api/documents/route.ts`: quando a flag é `false`, `processDocumentPdf` não é chamado após o upload.

---

## 7. Limite por usuário (recomendado para depois)

Hoje há limite **por requisição** (tamanho do arquivo, rate limit por minuto). Ainda **não** há:

- Limite de **quantidade total de documentos** por usuário.
- Limite de **armazenamento total** por usuário (Blob).

Isso pode virar problema em abuso ou contas “infinitas”. Considerar para uma próxima versão (ex.: 100 documentos por usuário, 500 MB por usuário).

---

## 8. Monitoramento mínimo (recomendado)

- [ ] **Alertas de erro 5xx** (ex.: Vercel Notifications, Sentry, ou outro APM).
- [ ] **Log centralizado** (mínimo: Vercel Logs; ideal: serviço de log com busca).
- [ ] Revisar logs após os testes de ponta a ponta e rate limit.

Sem isso, você tende a descobrir problema quando o cliente reclama.

---

## Resumo de status

| Área | Status |
|------|--------|
| Segurança operacional | Boa (com env e testes acima). |
| Consistência financeira | Muito boa (dedup, SyncLog, watchdog). |
| Escalabilidade média | Boa (rate limit, índices). |
| Blindagem enterprise | Parcial (workers dedicados, blob privado = V2). |
| Pronto para cliente real | **Sim**, desde que: env configurado, E2E e rate limit testados, backups e monitoramento mínimos atendidos. |
