# Política de retenção de documentos (PDFs)

Documento para alinhamento com cliente e requisitos regulatórios.

---

## Comportamento atual (técnico)

| Aspecto | Situação |
|--------|----------|
| **Armazenamento** | PDFs ficam no **Vercel Blob** (storage na nuvem) e o registro no banco (PostgreSQL) **até serem excluídos**. Não há TTL nem expiração automática. |
| **Exclusão pelo cliente** | **Sim.** O usuário pode excluir um documento pela interface (lista de documentos → botão excluir). A API `DELETE /api/documents/[id]` remove o arquivo no Blob e o registro no banco, sempre escopado por `userId`. |
| **Política de retenção automática** | **Não existe.** Nenhum job/cron apaga documentos antigos. Ou seja: **retenção é indefinida** até o usuário (ou um admin) excluir. |

---

## Respostas diretas

- **PDFs ficam salvos para sempre?**  
  Na prática, **sim**, até que alguém exclua. Não há limite de tempo nem exclusão automática por idade.

- **Cliente pode excluir?**  
  **Sim.** Delete está implementado na API e na tela de documentos (botão de excluir por documento).

- **Existe política de retenção?**  
  **Não** no código. Não há regra técnica de “apagar após X dias/meses”. A “política” atual é: **dados ficam até exclusão manual**.

---

## Para cliente financeiro / exigências

1. **Documentar a política de negócio**  
   Definir em contrato ou termo:
   - Por quanto tempo a plataforma **guarda** os documentos (ex.: 5 anos, 7 anos, conforme regulatório).
   - Se haverá **exclusão automática** após esse prazo (aí seria necessário implementar um cron/job).

2. **Direito ao apagamento**  
   Hoje o usuário já pode excluir seus documentos. Se o cliente exigir “direito ao esquecimento” ou apagamento sob demanda, o fluxo atual já atende; basta deixar explícito na documentação/termos.

3. **Exclusão automática (retenção máxima)**  
   Se o cliente exigir “não guardar mais que X meses/anos”:
   - Seria necessário **implementar** um job (cron) que:
     - Liste documentos com `createdAt` (ou `vencimentoAt`) anterior ao limite.
     - Chame a mesma lógica de exclusão (remover blob + registro), respeitando `userId`.
   - Opcional: configurável por tenant (ex.: variável `DOCUMENT_RETENTION_DAYS`).

---

## Recomendação

- **Alinhar expectativa com o cliente:** informar que hoje os PDFs **não expiram** e que a exclusão é **sob demanda** (pelo usuário).
- **Se vier exigência de retenção limitada:** definir o prazo (ex.: 7 anos) e planejar o desenvolvimento do job de limpeza automática + documentar na política de retenção.
