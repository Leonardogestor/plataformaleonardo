# Verificação crítica final (~5 minutos)

**Antes de entregar**, confirme visualmente cada item abaixo. Se algum falhar, **não entregue** até corrigir.

---

## 1. Webhook está recebendo eventos?

**O que fazer:** Conectar um banco (Pluggy) em produção e, em seguida, abrir os **logs** (Vercel → Project → Logs, ou seu agregador).

**O que você PRECISA ver nos logs:**

```json
{"type":"pluggy_sync","itemId":"...","durationMs":...,"accountsProcessed":...,"transactionsProcessed":...}
```

- Se **não aparecer** `type: "pluggy_sync"` após conectar o banco → o webhook **não está ativo** (URL errada no Pluggy, secret errado, ou rota não sendo chamada). Corrija antes de entregar.

---

## 2. SyncLog está sendo preenchido corretamente?

**O que fazer:** Abrir o banco (Prisma Studio, `psql`, ou painel do provider) e consultar a tabela **sync_logs** (ou `SyncLog`).

**Confirme:**

| Campo | Esperado |
|-------|----------|
| **startedAt** | Preenchido (timestamp). |
| **finishedAt** | Preenchido (não null). |
| **durationMs** | Número > 0. |
| **transactionsProcessed** | Coerente com o que você vê em transações (pode ser 0 se não houver transações no período). |

- Se **durationMs** estiver **sempre null** ou **finishedAt** sempre null → algo está errado no fluxo (sync ou PDF não está completando a atualização do SyncLog). Não entregue até corrigir.

---

## 3. Reprocessamento de PDF não duplica transações

**O que fazer:**

1. Fazer **upload do mesmo PDF 2 vezes** (dois documentos diferentes, mesmo arquivo).
2. Ir em **Transações** e contar/filtrar pelas descrições ou valores que vêm desse PDF.

**Confirme:**

- **Não duplica:** o total de transações geradas deve ser o **mesmo** que subir o PDF uma vez (a segunda vez só reutiliza/atualiza).
- No banco, em **transactions**, as linhas vindas desse PDF devem ter **externalTransactionId** começando com **`pdf:`** (ex.: `pdf:a1b2c3...`).

Se **duplicar** transações ou não houver `pdf:` no **externalTransactionId** → deduplicação não está ativa. **Não entregue.**

---

## 4. Rate limit está usando Redis?

**O que fazer:** No **ambiente de produção** (ex.: Vercel → Settings → Environment Variables), conferir:

- **UPSTASH_REDIS_REST_URL** está definido?
- **UPSTASH_REDIS_REST_TOKEN** está definido?

**Sem essas duas variáveis em produção:**

- **Não existe** rate limit (qualquer usuário pode fazer dezenas de uploads/syncs seguidos).
- O código só aplica limite quando o Redis está configurado.

**Confirme** que as variáveis do Upstash estão **ativas em produção**. Opcional: fazer 11 uploads em 1 minuto e ver o 11º retornar **429**.

---

## 5. Backup REAL está ativado

**Não é só checklist.** É verificar **no provider do banco** (Neon, Railway, Supabase, RDS, etc.):

- **Backup automático** está **ativado**?
- Você **consegue restaurar**? (Se possível, fazer um restore de teste em outro projeto/DB.)

Se **não tiver backup** configurado e testado, **esse é o único ponto que pode travar a entrega** para uso real com dados financeiros.

---

## Resumo rápido

| # | Verificação | Falhou = não entregar |
|---|-------------|------------------------|
| 1 | Log com `type: "pluggy_sync"` após conectar banco | Webhook inativo |
| 2 | SyncLog com startedAt, finishedAt, durationMs > 0 | Sync/PDF não completando |
| 3 | Mesmo PDF 2x → sem duplicar; externalTransactionId com `pdf:` | Dedup inativa |
| 4 | UPSTASH_* em produção | Rate limit inativo |
| 5 | Backup automático ativo + consegue restaurar | Risco de perda de dados |

Depois desses 5 minutos de verificação real, você sabe se está pronto para entregar.
