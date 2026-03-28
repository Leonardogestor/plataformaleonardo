# ✅ CHECKLIST DE QA / HOMOLOGAÇÃO — LMG PLATAFORMA FINANCEIRA

> Use este documento para validar a consistência, integração e robustez da plataforma antes do deploy. Marque cada item conforme for testado. Pode ser usado por dev, QA ou cliente (Leo).

---

## 1. Cálculos e Recálculos

- [ ] Projeções refletem fielmente receitas, despesas, aportes, investimentos e metas.
  - Exemplo: Criar transação de receita e despesa, conferir projeção mensal e anual.
- [ ] Alterações em transações, orçamento, metas ou investimentos atualizam projeções sem refresh manual.
  - Exemplo: Editar transação retroativa → validar recálculo em Dashboard, Orçamento e Projeções.
- [ ] Percentuais, status e prazos de metas batem com a realidade dos dados.
  - Exemplo: Alterar orçamento de Alimentação de 1.000 para 800 → verificar impacto imediato em metas.

## 2. Integração Entre Telas

- [ ] Dashboard, Orçamento, Metas e Projeções mostram dados consistentes entre si.
  - Exemplo: Lançar despesa em uma tela, conferir atualização nas demais.
- [ ] Drill-down de categoria mostra impacto futuro e permite ajuste imediato, refletindo nas projeções.
  - Exemplo: Ajustar valor de categoria via drill-down e conferir projeção.
- [ ] Metas aparecem corretamente na tela de Projeções, com status e prazo coerentes.
  - Exemplo: Criar meta inviável → sistema sinaliza corretamente.

## 3. Comportamento Real de Uso

- [ ] Edição inline de orçamento funciona (Enter salva, Esc cancela, opções de replicar).
  - Exemplo: Editar orçamento, pressionar Enter/Esc, validar resultado e feedback.
- [ ] Cards, gráficos e insights reagem a mudanças de cenário e período.
  - Exemplo: Trocar período/scenario e conferir atualização instantânea.
- [ ] Nenhum dado “mágico” ou incoerente aparece em cards, gráficos ou insights.
  - Exemplo: Buscar valores negativos ou incoerentes após edições.

## 4. Experiência de Fluxo

- [ ] Usuário consegue navegar do diagnóstico ao ajuste e ver o novo futuro sem fricção.
  - Exemplo: Ajustar meta e conferir atualização em cards e gráficos sem recarregar.
- [ ] Feedback visual e textual é claro em todas as ações críticas (edição, erro, sucesso).
  - Exemplo: Forçar erro de validação e conferir mensagem exibida.

## 5. Robustez

- [ ] Erros de API e validação aparecem de forma compreensível.
  - Exemplo: Simular erro de conexão ou input inválido e validar mensagem.
- [ ] Não há refresh manual necessário para ver dados atualizados.
  - Exemplo: Editar dado e conferir atualização automática em todas as telas.
- [ ] Testes de edge cases: valores extremos, metas não atingíveis, meses sem dados.
  - Exemplo: Criar meta impossível, lançar valor muito alto/baixo, testar mês sem transações.

---

## 🔄 FLUXO DE QA COLABORATIVO

1. **QA técnico (dev / você)**
   - Validar cálculos, recálculos, erros e edge cases
2. **QA de produto (você)**
   - Validar experiência consultiva, clareza de feedback e fluxo
3. **QA de visão (Leo, se quiser)**
   - Validar se a experiência e resultados batem com a visão do Leo

Todos usam o mesmo checklist, marcando exemplos e anotando observações.

---

> Observações/Notas:

---

**Responsável pelo QA:**

Data: **/**/\_\_\_\_

Versão/Teste: **\_\_\_\_**
Versão/Teste: **\*\*\*\***\_\_**\*\*\*\***
