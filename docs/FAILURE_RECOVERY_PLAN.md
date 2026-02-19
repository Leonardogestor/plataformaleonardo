# Plano de recuperação de falha e alertas

Se amanhã a Pluggy mudar o formato, o parser quebrar ou o PDF falhar silenciosamente: **você tem como saber?**

Hoje há **logs** e **estado persistido** (FAILED), mas **não há alerta automático**. Não é obrigatório para entrega; é maturidade operacional.

---

## O que existe hoje

| Canal | O que cobre |
|-------|----------------|
| **Logs (stdout)** | `console.info` / `console.warn` / `console.error` em `lib/pdf-processing.ts`, `lib/pluggy-sync.ts`, `lib/document-extract.ts`, webhook. Vercel (e qualquer host) captura stdout; dá para ver no dashboard da Vercel ou em ferramenta de log. |
| **Estado no banco** | Document: `status = FAILED` + `errorMessage`. SyncLog: `status = FAILED` + `error`. Assim você **pode** consultar “quantos falharam” e “por quê”. |
| **Watchdog** | Cron marca documentos em PROCESSING há >10 min como FAILED (evita travados sem status). Não notifica ninguém. |

Ou seja: **dá para descobrir** olhando logs ou rodando queries (documentos FAILED, SyncLog FAILED), mas **ninguém é avisado** quando algo quebra.

---

## Cenários de falha e como “saber”

| Cenário | Como aparece hoje | Alerta automático? |
|---------|-------------------|--------------------|
| **Pluggy muda formato / API quebra** | SyncLog FAILED, `console.error` no pluggy-sync, possivelmente webhook 500. | Não. |
| **Parser de PDF quebra (lib mudou, PDF novo)** | Document FAILED + errorMessage; `console.info`/error no pdf-processing. | Não. |
| **PDF falha “silenciosa”** (ex.: extração retorna vazio e você marca FAILED) | Document FAILED, SyncLog com status/error. | Não. |
| **Muitos FAILED em pouco tempo** | Só vendo logs ou consultando `documents` / `sync_logs` por status e data. | Não. |

Conclusão: **você tem os dados para saber**, mas **não tem notificação**. Quem não olhar logs ou banco não fica sabendo.

---

## Recomendações (maturidade, não obrigatório para go-live)

### 1. Alerta simples por volume de falhas (cron + webhook)

- **Ideia:** um cron (ex.: 1x/dia ou 1x a cada 6h) que:
  - Conta documentos com `status = 'FAILED'` e `updatedAt` nas últimas 24h (ou 6h).
  - Opcional: conta SyncLog com `status = 'FAILED'` no mesmo período.
  - Se o total passar de um limite (ex.: 5 ou 10), chama um **webhook** (Slack, Discord, e-mail via serviço, etc.) com resumo: “X documentos e Y syncs falharam nas últimas 24h”.
- **Onde:** novo endpoint protegido por `CRON_SECRET`, ex.: `GET /api/cron/alert-failures` (ou POST). O cron externo (Vercel Cron, QStash, etc.) chama esse endpoint; o endpoint faz as contas e, se passar do limite, faz um `fetch` para a URL configurada (ex.: `ALERT_WEBHOOK_URL`).
- **Custo:** mínimo (uma chamada por período; um fetch para webhook).

Assim, **mudança de formato da Pluggy** ou **pico de PDF FAILED** vira notificação, sem depender de alguém olhar o dashboard.

### 2. (Opcional) Error tracking (Sentry ou similar)

- Em `pdf-processing` e `pluggy-sync`, em blocos `catch`, além de atualizar Document/SyncLog e logar em console, chamar `Sentry.captureException(error)` (ou equivalente).
- Benefício: stack trace, agrupamento, alertas nativos do Sentry quando taxa de erro sobe. Não substitui o cron de “volume de FAILED”, mas complementa (erros inesperados que nem chegam a virar FAILED no banco).

### 3. (Opcional) Health / heartbeat

- Endpoint tipo `GET /api/health` que retorna 200 (e opcionalmente versão ou “ok”). Serviços de monitoramento (Uptime Robot, Better Uptime, etc.) batem a cada 5 min; se cair, você recebe alerta.
- Isso não detecta “parser quebrou” nem “Pluggy mudou formato”; detecta “app fora do ar”. Útil para maturidade geral.

### 4. Queries úteis para diagnóstico manual

Enquanto não houver alerta, dá para rodar no banco:

- Documentos falhados recentes:  
  `SELECT id, "userId", "fileName", status, "errorMessage", "updatedAt" FROM documents WHERE status = 'FAILED' AND "updatedAt" > NOW() - INTERVAL '24 hours' ORDER BY "updatedAt" DESC;`
- Syncs falhados recentes:  
  `SELECT id, "itemId", "documentId", status, error, "finishedAt" FROM sync_logs WHERE status = 'FAILED' AND "finishedAt" > NOW() - INTERVAL '24 hours';`

Guarde essas (ou equivalentes em Prisma) num runbook ou no próprio doc de operação.

---

## Resumo

- **Hoje:** logs + estado FAILED no banco + watchdog. **Não há** alerta automático.
- **Para “saber” quando algo quebra:** implementar um cron que conta FAILED (documentos e/ou sync_logs) e chama um webhook quando passar de um limite é o passo com melhor custo/benefício.
- **Opcional:** Sentry (ou similar) para exceções; health check para disponibilidade.
- Isso não é obrigatório para entrega, mas aumenta bastante a maturidade operacional e evita “descobrir que quebrou” só quando o cliente reclamar.
