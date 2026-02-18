# Comparativo: Meu Planner Financeiro × Plataforma Leo

Análise com base no código da plataforma Leo (estado atual) e na análise pública do Meu Planner Financeiro (12/02/2026).

---

## 1. Tabela resumo: o que já temos × o que falta

| Funcionalidade (Meu Planner) | Na Leo hoje | Situação | Observação |
|-----------------------------|-------------|----------|------------|
| **Personalização (categorias e subcategorias)** | Categorias sim; subcategorias só na UI (filtro) e em página separada em estado local | **Parcial** | Falta: subcategoria no modelo de dados e na importação; tela única de categorias/subcategorias persistidas |
| **IA para sugerir categorização** | Regras por padrão (pattern) + API `/api/categorization/suggest` | **Parcial** | Sugestão por regras (não IA generativa); dá para evoluir para LLM depois |
| **Planejamento orçamentário (planejado x realizado)** | Orçamento por categoria/mês; API budget + drilldown; página Orçamento; comparativo gasto vs limite | **Sim** | Tela de orçamento mais simples que a do Meu Planner (sem tabela mês a mês por categoria) |
| **Importação de dados (OFX, XLS, PDF)** | Apenas CSV (upload → mapeamento de colunas → import JSON) | **Parcial** | Falta: parser OFX, parser XLS/XLSX, import de faturas/extratos em PDF |
| **Gestão de metas** | Metas (Goal), contribuições, página Metas, cards com progresso, prazos, status | **Sim** | Equivalente à “Meus Planos”; falta gráfico de barras de evolução mensal por meta (opcional) |
| **Controle de patrimônio / investimentos** | Investimentos (modelo + CRUD), movimentos, página Investimentos, drilldown, resumo no dashboard | **Sim** | Ativos e investimentos centralizados; histórico de movimentos (aporte/retirada) |
| **Dashboards e gráficos** | Dashboard com abas (Passado/Presente/Futuro), fluxo de caixa, patrimônio, metas, cartões, transações, insights | **Sim** | Gráficos de evolução, barras, rosca por categoria (CategoryChart); atende ao referencial |
| **Gestão de contas e cartões** | Contas (Account), cartões (Card), Open Finance (Pluggy), conexões, parcelamentos | **Sim** | Contas e cartões consolidados; conexão bancária via Pluggy |
| **Tela “Planejamento e Controle” (tabela categoria x mês)** | Orçamento por mês/categoria; não há tabela única “categoria × vários meses” | **Parcial** | Falta: visão matricial planejado x realizado por mês (como no Meu Planner) |
| **Tela “Meus Planos” (cards + gráfico de barras por meta)** | Cards de metas com barra de progresso; sem gráfico de evolução mensal por meta | **Parcial** | Falta: gráfico de barras da evolução mensal do valor acumulado por meta |
| **Tela Patrimônio (lista ativos + histórico)** | Página Investimentos com lista, instituição, datas, movimentos | **Sim** | Atende; pode enriquecer com “finalidade” por ativo se desejado |
| **Importação de planilhas Excel** | Não (apenas CSV) | **Não** | Import atual é CSV; planilhas Excel seriam XLS/XLSX |
| **Bônus: planilhas/simuladores (SAC, Price, etc.)** | Não | **Não** | Simuladores e planilhas bônus não existem na Leo |
| **Upload/gestão de PDFs (documentos)** | Link “Enviar PDF” no dashboard aponta para `/documents`; rota não existe | **Não** | Falta: módulo de documentos (upload, listagem, possível OCR/extração futura) |
| **Exportação (relatórios)** | Export CSV/Excel/PDF (relatório mensal/anual) | **Sim** | Via `/api/export` e tela de Relatórios |
| **Segurança e acesso (login, web)** | NextAuth, acesso web, dados no backend | **Sim** | Atende |

---

## 2. O que já temos (resumo)

- **Categorias**: uso em transações, orçamento e regras de categorização; lista de categorias vinda das transações; página “Categorias” com subcategorias em estado local (não persistido no banco).
- **Sugestão de categoria**: regras por padrão (pattern) em `/api/categorization/suggest`; não é IA generativa, mas já agiliza o preenchimento.
- **Orçamento**: modelo `Budget` (userId, category, month, amount); API GET/PATCH com drilldown; página Orçamento com gasto vs limite por categoria; sem tabela “mês a mês” por categoria.
- **Metas**: modelo `Goal` + `GoalContribution`; página Metas com abas (Ativas/Concluídas/Pausadas), cards com progresso e contribuições; sem gráfico de evolução mensal por meta.
- **Investimentos/patrimônio**: modelo `Investment` + `InvestmentMovement`; página Investimentos com tabela, drilldown, aporte/retirada; resumo no dashboard.
- **Dashboard**: abas Passado (patrimônio), Presente (métricas, fluxo, transações, metas, cartões, investimentos), Futuro (link Projeções); gráficos e insights.
- **Contas e cartões**: modelos `Account`, `Card`, `BankConnection`; Open Finance (Pluggy); parcelamentos (`InstallmentGroup`).
- **Importação**: apenas CSV (upload → preview → mapeamento → review → import); API recebe JSON de transações.
- **Projeções**: página e API de projeções com cenários e metas.
- **Relatórios**: exportação CSV/Excel/PDF.

---

## 3. O que falta inserir (priorizado)

### Alta prioridade (diferenciais e consistência)

1. **Subcategorias no modelo e no fluxo**
   - Incluir campo `subcategory` (opcional) no modelo `Transaction` e nas APIs (transações, import, filtros).
   - Persistir categorias/subcategorias (ex.: modelo `Category`/`Subcategory` ou equivalente) em vez de só estado local na página Categorias.
   - Criar/ajustar API de listagem de subcategorias (ex.: `/api/transactions/subcategories`) para o filtro de transações não quebrar.

2. **Importação OFX e Excel**
   - Parser de OFX para extratos bancários (e, se aplicável, cartão).
   - Parser de XLS/XLSX para importação de planilhas/extratos; reutilizar fluxo de mapeamento/review quando fizer sentido.

3. **Tela “Planejamento e Controle” (visão matricial)**
   - Uma tela (ou aba) que mostre tabela: categorias/subcategorias × meses, com colunas “planejado” e “realizado” por mês, alinhada ao conceito do Meu Planner.

4. **Módulo de Documentos (PDF)**
   - Criar rota/página `/documents` (upload, listagem, opcionalmente tags ou vínculo com transações).
   - Deixar preparado para futura extração de dados de faturas/extratos em PDF (OCR/IA).

### Média prioridade (melhoria de produto)

5. **IA de categorização**
   - Manter regras por padrão e evoluir com sugestão via LLM (ex.: descrição da transação → categoria sugerida) para se aproximar do “IA para sugerir categorização” do Meu Planner.

6. **Gráfico de evolução mensal por meta**
   - Na página Metas (ou no card/drilldown da meta), adicionar gráfico de barras com evolução do valor acumulado mês a mês (como na “Meus Planos” do Meu Planner).

7. **Orçamento com valores variáveis**
   - Se desejado, evoluir orçamento para suportar “valor variável” ou faixa (mín/máx) além do valor fixo atual.

### Baixa prioridade (bônus)

8. **Importação de PDF de extratos/faturas**
   - Após o módulo de documentos e eventual OCR/extração, permitir importar transações a partir de PDF (fatura de cartão, extrato).

9. **Bônus: simuladores (SAC, Price, etc.)**
   - Planilhas ou telas de simulação de financiamento (Tabela SAC e Price), custo da hora de trabalho, projeção de investimento, etc., como no pacote bônus do Meu Planner.

---

## 4. Resumo executivo

- **Já temos**: gestão de metas, controle de patrimônio/investimentos, dashboards e gráficos, contas e cartões (incl. Open Finance), orçamento por categoria/mês, categorização por regras (sugestão), exportação CSV/Excel/PDF, projeções e relatórios.
- **Falta com maior impacto**: subcategorias persistidas e no fluxo completo; importação OFX e Excel; tela de planejamento matricial (planejado x realizado por mês); módulo de documentos (PDF); e, em seguida, IA de categorização e gráfico de evolução por meta.

Este documento pode ser usado para priorizar backlog e alinhar a Leo às funcionalidades descritas na análise do Meu Planner Financeiro.
