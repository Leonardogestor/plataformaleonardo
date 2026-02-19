# Processamento de PDF e escala

## Estado atual (modo otimista)

- Após upload, `processDocumentPdf(doc.id)` é chamado em background (fire-and-forget).
- Não há fila: vários PDFs simultâneos rodam na mesma instância/serverless.
- Se 10 usuários subirem PDF ao mesmo tempo e cada um levar 4–8s, há risco de:
  - estourar tempo de execução (timeout),
  - execução interrompida (cold start, reinício),
  - perda de processamento.

Funciona bem com pouca concorrência; não é robusto em escala.

## Watchdog (documentos “zumbi”)

Se a função for encerrada antes do processamento terminar, o documento pode ficar eternamente em **PROCESSING**.

- **Rota:** `GET /api/cron/watchdog-documents` (protegida por `CRON_SECRET`).
- **Lógica:** documentos com `status = PROCESSING` e `updatedAt` há mais de **10 minutos** são marcados como **FAILED** com `errorMessage: "Processing timeout (watchdog)"`.
- **Agendamento hoje:** cron **externo** (ex: cron-job.org) a cada 5–10 min, chamando a URL com `Authorization: Bearer <CRON_SECRET>` ou `?secret=<CRON_SECRET>`.

**Risco operacional:** depender de cron externo cria ponto de falha fora da sua infra (serviço cai, token expira, URL muda, alguém esquece de configurar). Funcional, mas não ideal para enterprise.

**Alternativas melhores (quando possível):** Upstash QStash (agendar o watchdog na mesma infra) ou Vercel Cron quando permitir envio de header com o secret.

- Assim evita-se documento preso em PROCESSING sem fim.

## Próximo nível (fila real)

Para ambiente fintech/alta carga, recomenda-se:

1. **Upstash QStash** (ou similar): enfileirar um job por documento (ex. `{ documentId }`); worker ou route handler consome a fila e chama `processDocumentPdf(documentId)` com retry e backoff.
2. **Vercel Edge / Function dedicada**: rota que só processa PDF (ex. cron ou webhook) com timeout maior e limite de concorrência.
3. **Worker separado** (ex. Node em outro serviço): consome de fila (Redis, SQS, etc.) e chama a lógica de processamento.

Com fila: upload apenas envia o job; o consumo controla concorrência, retentativas e duração, evitando perda de processamento e estouro de execução.

## Isolamento em escala (500+ ativos simultâneos)

Hoje PDF e Pluggy rodam no mesmo ambiente serverless que a API. Em pico (ex.: 20 syncs + 10 PDFs + dashboard), tudo pode degradar junto.

Em escala real recomenda-se:

- **Worker dedicado para PDF:** consumir fila de documentos (ex. QStash, SQS); apenas esse worker chama `processDocumentPdf`. API só enfileira.
- **Worker dedicado para Open Finance:** sync Pluggy em worker separado (ou fila dedicada), para não competir com API e PDF.
- **API:** focada em leitura e UX (listagens, filtros, formulários, download por proxy). Escrita pesada (import, sync) delegada aos workers.

Assim picos de PDF ou de sync não derrubam a experiência da API.

## Backpressure / rate limit

Para evitar abuso e dar controle em pico (ex.: 30 uploads + 10 reprocessamentos + 20 syncs manuais por um único usuário), há rate limit **por usuário** nos endpoints pesados:

- **Documentos (upload + reprocess):** 10 requisições por usuário por minuto (sliding window). Rota de listagem e download não contam.
- **Sync manual (Open Finance):** 10 requisições por usuário por minuto (sliding window).

Implementação: **Upstash Redis** + `@upstash/ratelimit`. Quando `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` estão definidos, o limite é aplicado; caso contrário não há limite (útil em dev sem Redis).

Resposta ao exceder: **429** com `Retry-After` (segundos) e mensagem em português. Em produção, configurar Upstash Redis (há tier gratuito) para ativar o controle.
