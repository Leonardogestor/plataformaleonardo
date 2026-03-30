# Funcionalidade de Edição de Categoria em Massa

## Descrição
Esta funcionalidade permite ao usuário alterar a categoria de múltiplas transações selecionadas de uma só vez, economizando tempo e facilitando a organização financeira.

## Como Funciona

### 1. Seleção de Transações
- Na página de Transações (`/transactions`), o usuário pode selecionar transações individuais usando os checkboxes
- Use o botão "Selecionar Todos" para selecionar todas as transações da página atual
- O contador mostra quantas transações estão selecionadas

### 2. Edição em Massa
- Após selecionar transações, dois botões aparecem:
  - **"Editar Categoria (N)"**: Abre dialog para alterar categoria
  - **"Excluir (N)"**: Exclui transações selecionadas (já existia)

### 3. Dialog de Edição
- **Categoria**: Campo obrigatório com lista de categorias pré-definidas
- **Subcategoria**: Campo opcional com subcategorias comuns
- **Botões**: Cancelar e "Atualizar Categoria"

### 4. Processamento
- Ao confirmar, o sistema atualiza todas as transações selecionadas
- Mostra feedback de sucesso com quantidade atualizada
- Atualiza automaticamente o dashboard
- Limpa seleção após sucesso

## Componentes Criados

### 1. `BulkEditCategoryDialog`
- **Arquivo**: `components/transactions/bulk-edit-category-dialog.tsx`
- **Função**: Dialog para seleção de categoria e subcategoria
- **Características**:
  - Lazy loading para performance
  - Validação de formulário
  - Feedback visual de loading
  - Toast notifications

### 2. API Endpoint
- **Arquivo**: `app/api/transactions/bulk-edit-category/route.ts`
- **Método**: `PATCH`
- **Função**: Atualiza múltiplas transações no banco
- **Validações**:
  - Autenticação do usuário
  - Propriedade das transações
  - Schema validation com Zod

## Modificações Realizadas

### 1. Página de Transações
- **Arquivo**: `app/(dashboard)/transactions/page.tsx`
- **Alterações**:
  - Import do `BulkEditCategoryDialog`
  - Estado `isBulkEditDialogOpen`
  - Handler `handleBulkEditSuccess`
  - Botão "Editar Categoria" ao lado de "Excluir"
  - Componente dialog no final da página

## Fluxo de Usuário

1. **Acessar** `/transactions`
2. **Selecionar** transações desejadas
3. **Clicar** em "Editar Categoria (N)"
4. **Escolher** categoria e subcategoria
5. **Confirmar** atualização
6. **Visualizar** feedback de sucesso

## Categorias Disponíveis

### Principais
- Alimentação
- Moradia
- Transporte
- Saúde
- Educação
- Lazer
- Compras
- Serviços
- Investimentos
- Outras Receitas
- Outras Despesas
- Salário
- Transferência

### Subcategorias (Exemplos)
- **Alimentação**: Mercado, Restaurante, Delivery
- **Transporte**: Combustível, Uber/99
- **Moradia**: Condomínio, IPTU, Luz, Água, Gás
- **Saúde**: Plano de Saúde, Farmácia
- **Educação**: Material Escolar, Cursos, Livros
- **Lazer**: Cinema, Viagens
- **Compras**: Roupas, Eletrônicos, Móveis
- **Serviços**: Celular/Internet, Streaming, Academia
- **Despesas**: IPVA, Seguro, Impostos

## Segurança
- Apenas transações do usuário autenticado podem ser alteradas
- Validação server-side dos dados
- Proteção contra manipulação de IDs

## Performance
- Operação em massa com `updateMany` do Prisma
- Lazy loading dos componentes
- Atualização otimizada do dashboard

## Próximos Melhorias
- Suporte a edição de múltiplos campos (além de categoria)
- Histórico de alterações em massa
- Seleção跨páginas
- Preview das alterações antes de confirmar
