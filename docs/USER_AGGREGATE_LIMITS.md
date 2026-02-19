# Limites por usuário – requisição vs agregados

Hoje a aplicação limita **requisição** (rate), mas **não** limita totais por usuário. Isso não bloqueia entrega, mas pode virar custo invisível (storage, DB, Pluggy).

---

## O que existe hoje

| Tipo | Limite atual | Onde |
|------|----------------|------|
| **Upload de PDF** | 10 MB por arquivo | `lib/blob.ts` → `MAX_DOCUMENT_SIZE_BYTES`; validado em `POST /api/documents`. |
| **Requisições de upload/reprocess** | 10 por usuário por minuto (sliding window) | `lib/rate-limit.ts` → `checkDocumentsLimit`; Redis Upstash. |
| **Requisições de sync manual** | 10 por usuário por minuto | `checkSyncLimit`; Redis. |
| **Transações por PDF** | 5.000 por documento (import) | `lib/pdf-processing.ts` → `MAX_TRANSACTIONS_PER_DOCUMENT`; cap no processamento. |

---

## O que não existe (risco de custo)

| Agregado | Risco | Impacto |
|----------|--------|---------|
| **Total de PDFs por usuário** | Ex.: 200, 1000, 10.000 documentos | Mais objetos no Vercel Blob, mais linhas em `documents`, listagens e índices maiores. |
| **Armazenamento total por usuário (bytes)** | Ex.: 2 GB, 10 GB de PDFs | Custo direto no Blob; possível impacto em tempo de listagem se somar `fileSize` em toda lista. |
| **Total de transações por usuário** | Ex.: 100k, 1M de linhas em `transactions` | Tamanho do banco, tempo de queries (dashboard, relatórios, export), backup. |

Nenhum desses totais é verificado hoje. Um único usuário (ou abuso) pode crescer indefinidamente dentro do plano atual.

---

## Recomendações (não bloqueiam entrega)

### 1. Documentar e alinhar com produto/comercial

- Definir limites “de contrato” por plano (ex.: Plano X = até 200 PDFs e 2 GB por usuário; transações conforme uso).
- Comunicar ao cliente que hoje não há teto técnico; quando houver, avisar com antecedência.

### 2. Implementar tetos quando fizer sentido

- **Máximo de documentos por usuário**  
  - Constante ou env (ex.: `MAX_DOCUMENTS_PER_USER=200`).  
  - No `POST /api/documents`, antes do upload:  
    `const count = await prisma.document.count({ where: { userId: session.user.id } })`  
    Se `count >= MAX_DOCUMENTS_PER_USER`, retornar 403 com mensagem clara (ex.: “Limite de documentos atingido. Exclua alguns ou faça upgrade.”).

- **Máximo de armazenamento por usuário (bytes)**  
  - Constante ou env (ex.: `MAX_STORAGE_BYTES_PER_USER=2e9` = 2 GB).  
  - No `POST /api/documents`:  
    `const sum = await prisma.document.aggregate({ where: { userId }, _sum: { fileSize: true } })`  
    Usar `(sum._sum.fileSize ?? 0) + file.size <= MAX_STORAGE_BYTES_PER_USER`.  
  - Garantir que `fileSize` está sempre preenchido ao criar/atualizar o documento (já está no upload atual).

- **Máximo de transações por usuário (opcional)**  
  - Mais pesado (count/aggregate em tabela grande).  
  - Opções: (a) só contar no upload/sync e bloquear novo import/sync se passar do teto; (b) job periódico que apenas alerta (não bloqueia); (c) limite por plano em contrato, com monitoramento manual ou dashboard interno.

### 3. Onde colocar as verificações

- **Documentos e storage:** em `app/api/documents/route.ts` no `POST`, depois do rate limit e antes de `uploadDocumentBlob`. Assim evitamos criar blob e registro e depois falhar por limite.
- **Transações:** no início de `syncItemTransactions` (Pluggy) e no fluxo de import de PDF (ex.: antes de inserir em massa), se decidir teto por usuário.

### 4. Mensagens e códigos HTTP

- 403 com corpo tipo `{ error: "Limite de documentos atingido.", code: "DOCUMENT_LIMIT" }` (e equivalente para storage/transações) permite ao front mostrar mensagem específica e eventual CTA de upgrade.

---

## Resumo

- **Hoje:** só há limite de **requisição** (rate) e de **tamanho por arquivo**; **não** há limite de total de PDFs, total de armazenamento nem total de transações por usuário.
- **Risco:** custo invisível (Blob, DB, performance) se um usuário ou abuso crescer muito.
- **Entrega:** não bloqueia; vale documentar e alinhar expectativa. Quando quiser controlar custo, implementar os tetos acima (começando por documentos e storage).
