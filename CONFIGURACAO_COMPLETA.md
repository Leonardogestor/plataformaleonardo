# LMG Platform - Configuração Completa para ChatGPT

## 📋 Visão Geral

**Nome do Projeto**: LMG Platform  
**Descrição**: Plataforma Financeira e Patrimonial Completa  
**Versão**: 1.0.0  
**Stack Principal**: Next.js 14 + TypeScript + PostgreSQL + Prisma

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Linguagem**: TypeScript (configuração strict)
- **Estilização**: TailwindCSS + shadcn/ui
- **Componentes**: Radix UI
- **Gráficos**: Recharts, Chart.js
- **Gerenciamento de Estado**: Zustand, React Query
- **Formulários**: React Hook Form + Zod

### Backend
- **API**: Next.js API Routes
- **Banco de Dados**: PostgreSQL
- **ORM**: Prisma
- **Autenticação**: NextAuth com JWT
- **Validação**: Zod
- **Processamento**: PDF/Excel com OCR (Tesseract.js)

### Infraestrutura
- **Node.js**: >=18.17.0
- **NPM**: >=9.0.0
- **Deploy**: Vercel (otimizado)
- **Rate Limit**: Upstash Redis (opcional)
- **Open Finance**: Pluggy SDK

---

## 📁 Estrutura de Arquivos Principais

```
c:\plataformaleo/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Rotas autenticadas
│   ├── api/              # API Routes
│   └── globals.css       # Estilos globais
├── components/            # Componentes React
│   ├── ui/              # shadcn/ui
│   ├── dashboard/       # Dashboard components
│   └── ...
├── lib/                  # Utilitários e configurações
├── prisma/              # Schema e migrations
│   ├── schema.prisma    # Modelo de dados
│   └── seed.ts          # Dados iniciais
├── hooks/               # React hooks customizados
├── types/               # TypeScript types
├── public/              # Assets estáticos
└── scripts/             # Scripts de automação
```

---

## 🗄️ Modelo de Dados (Prisma Schema)

### Entidades Principais

#### User
```typescript
- id: String (cuid)
- name: String
- email: String (unique)
- password: String (bcrypt)
- role: UserRole (ADMIN | USER)
- createdAt/updatedAt: DateTime
```

#### Account (Contas Bancárias)
```typescript
- id: String (cuid)
- userId: String
- connectionId: String? (Open Finance)
- name: String
- type: AccountType (CHECKING | SAVINGS | INVESTMENT | CASH | OTHER)
- institution: String
- balance: Decimal(15,2)
- currency: String (default: BRL)
```

#### Transaction (Transações)
```typescript
- id: String (uuid)
- userId: String
- date: DateTime
- description: String
- amount: Decimal(15,2)
- type: TransactionType (INCOME | EXPENSE | TRANSFER)
- category: String
- subcategory: String?
- accountId: String?
- cardId: String?
- installmentGroupId: String?
```

#### Card (Cartões de Crédito)
```typescript
- id: String (cuid)
- userId: String
- name: String
- lastFourDigits: String(4)
- brand: String
- limit: Decimal(15,2)
- closingDay: Int
- dueDay: Int
```

#### Investment (Investimentos)
```typescript
- id: String (cuid)
- userId: String
- name: String
- type: InvestmentType (STOCKS | BONDS | REAL_ESTATE | FIXED_INCOME | CRYPTO | FUNDS | OTHER)
- amount: Decimal(15,2)
- currentValue: Decimal(15,2)
- quantity: Decimal?
- institution: String
- ticker: String?
- acquiredAt: DateTime
```

#### Budget (Orçamento)
```typescript
- id: String (cuid)
- userId: String
- category: String
- month: String (YYYY-MM)
- amount: Decimal(15,2)
```

#### Goal (Metas Financeiras)
```typescript
- id: String (cuid)
- userId: String
- name: String
- targetAmount: Decimal(15,2)
- currentAmount: Decimal(15,2)
- deadline: DateTime
- category: String
- status: GoalStatus (ACTIVE | COMPLETED | CANCELLED | PAUSED)
```

### Entidades Especializadas

#### Document (Processamento de Documentos)
```typescript
- id: String (cuid)
- userId: String
- name: String
- fileName: String
- mimeType: String
- filePath: String?
- extractedText: String?
- status: DocumentStatus (PROCESSING | COMPLETED | FAILED)
- fileUrl: String?
```

#### BankConnection (Open Finance)
```typescript
- id: String (cuid)
- userId: String
- provider: BankProvider (PLUGGY | BELVO | MANUAL)
- itemId: String (unique)
- status: ConnectionStatus
- lastSyncAt: DateTime?
```

#### financial_ledger (Livro Razão)
```typescript
- id: String
- userId: String
- eventType: LedgerEventType
- entityType: LedgerEntityType
- entityId: String
- amount: Decimal(15,2)
- sequenceNumber: BigInt
- source: LedgerSource
```

#### financial_snapshots (Snapshots Patrimoniais)
```typescript
- id: String
- userId: String
- snapshotDate: DateTime
- totalAssets: Decimal(15,2)
- netWorth: Decimal(15,2)
- savingsRate: Decimal(6,4)
- financialScore: Int?
```

---

## 🔧 Configuração do Ambiente

### Variáveis de Ambiente (.env)

#### Obrigatórias
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lmg_platform?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production-min-32-chars"

# App
NODE_ENV="development"
```

#### Inteligência Artificial
```bash
OPENAI_API_KEY="sk-your-openai-api-key-here"
AI_MODEL="gpt-4o-mini"
AI_TEMPERATURE="0.1"
DOCUMENT_PROCESSING_ENABLED="true"
AI_CONFIDENCE_THRESHOLD="0.7"
```

#### Open Finance (Pluggy)
```bash
PLUGGY_CLIENT_ID="your-pluggy-client-id"
PLUGGY_CLIENT_SECRET="your-pluggy-client-secret"
PLUGGY_WEBHOOK_SECRET="your-pluggy-webhook-secret"
```

#### Opcionais
```bash
# Rate Limiting
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Cron Jobs
CRON_SECRET=""

# Feature Flags
PDF_PROCESSING_ENABLED="true"
MAX_TRANSACTIONS_PER_DOCUMENT="5000"
```

---

## 🚀 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev              # Inicia servidor de desenvolvimento
npm run build            # Build para produção
npm run start            # Inicia servidor de produção
npm run lint             # ESLint
```

### Banco de Dados
```bash
npm run db:generate      # Gera Prisma Client
npm run db:push          # Push schema sem migration
npm run db:migrate       # Cria e aplica migrations
npm run db:seed          # Popula dados iniciais
npm run db:studio        # Abre Prisma Studio
npm run db:reset         # Reseta banco de dados
```

### Testes
```bash
npm run test             # Executa testes com Vitest
npm run test:watch       # Testes em modo watch
npm run test:ui          # Interface visual de testes
```

### Deploy e Infra
```bash
npm run setup            # Setup completo (install + migrate + seed)
npm run ngrok:start      # Inicia ngrok para webhooks
npm run dev:all          # Dev + ngrok simultâneo
```

---

## 🎨 Configuração UI/UX

### TailwindCSS Config
- **Design System**: Baseado em shadcn/ui
- **Cores Customizadas**: HSL com CSS variables
- **Dark Mode**: Suporte completo
- **Responsivo**: Breakpoints padrão + 2xl (1400px)
- **Animações**: Tailwind Animate + keyframes customizados

### Tema de Cores
```css
--primary: hsl(var(--primary))
--secondary: hsl(var(--secondary))
--success: hsl(var(--success))
--warning: hsl(var(--warning))
--destructive: hsl(var(--destructive))
--chart-1/5: hsl(var(--chart-1/5))
```

---

## 🔐 Autenticação e Segurança

### NextAuth Configuration
- **Provider**: Credentials (email/senha)
- **Strategy**: JWT
- **Session Duration**: 30 dias
- **Password Hashing**: bcryptjs
- **Middleware**: Proteção de rotas API

### Segurança Implementada
- Criptografia de senhas com bcrypt
- JWT secrets configuráveis
- Rate limiting (Upstash Redis)
- Validação server-side com Zod
- Proteção contra CSRF
- CORS configurado

---

## 📊 Funcionalidades Principais

### 1. Dashboard Estratégico
- **FinancialSummaryNew**: Cards principais (Receitas, Despesas, Investimentos)
- **StrategicDashboard**: Métricas chave e recomendações
- **FinancialTabs**: Dados detalhados com gráficos
- **ProjectionsManager**: Projeções futuras

### 2. Gestão Financeira
- **Contas Bancárias**: CRUD + Open Finance integration
- **Transações**: Importação CSV/PDF/Excel + categorização automática
- **Cartões**: Controle de limites e faturas
- **Orçamento**: Planejamento por categoria
- **Metas**: Acompanhamento de objetivos financeiros

### 3. Investimentos
- **Portfólio**: Tipos variados (Ações, Renda Fixa, Cripto, etc.)
- **Performance**: Cálculo de rentabilidade e risco
- **Análise**: Índice Sharpe, concentração, rebalanceamento
- **Importação**: Processamento de extratos de corretoras

### 4. Inteligência Artificial
- **Categorização Automática**: Baseada em padrões
- **Processamento de Documentos**: OCR com Tesseract.js
- **Análise Preditiva**: Projeções e recomendações
- **Detecção de Anomalias**: Gastos incomuns

### 5. Relatórios e Analytics
- **Relatórios Executivos**: PDF/Excel/CSV
- **Análise de Tendências**: Evolução patrimonial
- **Métricas Avançadas**: Savings rate, health score
- **Visualizações**: Gráficos interativos

---

## 🔌 Integrações Externas

### Open Finance (Pluggy)
- **Conexão Bancária**: Sincronização automática
- **Webhooks**: Atualização em tempo real
- **Suporte**: Principais bancos brasileiros

### Processamento de Documentos
- **PDF**: pdf-parse para extração de texto
- **Excel**: xlsx para planilhas
- **OCR**: tesseract.js para imagens
- **CSV**: papaparse para importação em massa

### AI Services
- **OpenAI**: GPT-4o-mini para categorização
- **Custom Models**: Configuração de temperatura e threshold
- **Batch Processing**: Processamento assíncrono

---

## 🏗️ Arquitetura e Padrões

### Estrutura de Pastas
```
app/
├── (dashboard)/        # Layout autenticado
│   ├── dashboard/      # Dashboard principal
│   ├── accounts/       # Gestão de contas
│   ├── transactions/   # Gestão de transações
│   ├── cards/          # Gestão de cartões
│   ├── budget/         # Orçamento
│   ├── investments/    # Investimentos
│   └── reports/        # Relatórios
├── api/               # API Routes
│   ├── auth/          # Autenticação
│   ├── accounts/      # CRUD contas
│   ├── transactions/  # CRUD transações
│   ├── cards/         # CRUD cartões
│   └── ...
└── admin/             # Painel administrativo
```

### Padrões de Código
- **TypeScript Strict**: Todas as validações habilitadas
- **Component Architecture**: Componentes reutilizáveis
- **Error Boundaries**: Tratamento de erros
- **Loading States**: Skeletons e spinners
- **Form Validation**: React Hook Form + Zod

### Performance
- **Code Splitting**: Configurado no Next.js
- **Lazy Loading**: Componentes e rotas
- **Image Optimization**: Next.js Image
- **Cache Estratégico**: React Query
- **Bundle Analysis**: Webpack otimizado

---

## 🧪 Testes

### Configuração
- **Framework**: Vitest
- **Testing Library**: React Testing Library
- **Coverage**: Configurado
- **Mock**: Prisma e APIs externas

### Estrutura de Testes
```
__tests__/
├── lib/                    # Testes de utilitários
├── components/             # Testes de componentes
└── integration/            # Testes de integração
```

---

## 🚀 Deploy e Produção

### Build Configuration
```javascript
// next.config.js
{
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  compress: true,
  productionBrowserSourceMaps: false,
}
```

### Otimizações
- **Bundle Splitting**: Vendor e common chunks
- **Image Domains**: Configurado para produção
- **Compression**: Gzip habilitado
- **Source Maps**: Desabilitado em produção

### Variáveis de Produção
- **NODE_ENV**: production
- **NEXTAUTH_URL**: URL de produção
- **DATABASE_URL**: PostgreSQL de produção
- **OPENAI_API_KEY**: Key de produção
- **PLUGGY_***: Credenciais de produção

---

## 📱 Mobile (Opcional)

### Estrutura
```
mobile/
├── App.tsx               # App principal
├── app/                  # React Navigation
├── components/           # Componentes mobile
└── assets/              # Assets mobile
```

### Configuração
- **Framework**: React Native
- **Navegação**: React Navigation
- **Estado**: Context API
- **Estilos**: StyleSheet

---

## 🔧 Debug e Troubleshooting

### Logs e Monitoramento
- **Console Logs**: Detalhados em desenvolvimento
- **Error Handling**: Try/catch global
- **Performance**: React DevTools
- **Database**: Prisma Studio

### Issues Comuns
1. **401 no Login**: Verificar NEXTAUTH_URL e porta
2. **Database Connection**: Verificar DATABASE_URL
3. **PDF Processing**: Verificar OPENAI_API_KEY
4. **Rate Limit**: Configurar Upstash Redis

---

## 📚 Documentação Adicional

### Arquivos Importantes
- `README.md`: Setup e quick start
- `DEPLOY.md`: Guia de deploy
- `OPEN_FINANCE.md`: Integração bancária
- `AI_PARSER_DOCUMENTATION.md`: Processamento IA

### Scripts Úteis
- `scripts/debug-build.js`: Debug de build
- `scripts/check-users.ts`: Verificação de usuários
- `scripts/migrate-production.js`: Migrations produção

---

## 🚀 Comandos Rápidos

### Setup Inicial
```bash
git clone <repo>
cd plataformaleo
npm install
cp .env.example .env
# Editar .env com suas credenciais
npm run setup
npm run dev
```

### Desenvolvimento
```bash
npm run dev              # Servidor dev
npm run db:studio        # Visualizar dados
npm run test:watch       # Testes contínuos
```

### Produção
```bash
npm run build            # Build
npm run start            # Servidor prod
npm run db:migrate:deploy # Deploy migrations
```

---

## 🎯 Fluxos Principais

### Novo Usuário
1. Registro → Login
2. Conectar contas (Open Finance)
3. Upload extratos históricos
4. Configurar orçamento
5. Definir metas
6. Analisar dashboard

### Usuário Ativo
1. Dashboard diário
2. Upload periódico de extratos
3. Categorização automática
4. Análise de investimentos
5. Ajuste de orçamento
6. Relatórios periódicos

---

## 📞 Suporte e Contato

### Documentação
- **Wiki do Projeto**: Arquivos `.md` na raiz
- **Code Comments**: TypeScript documentado
- **API Docs**: Routes com JSDoc

### Debug Tools
- **Prisma Studio**: `npm run db:studio`
- **Next.js DevTools**: Integrado
- **React DevTools**: Extensão browser
- **Network Tab**: Para APIs externas

---

## 🔜 Próximos Passos

### Para Configurar
1. Clonar repositório
2. Instalar dependências
3. Configurar variáveis de ambiente
4. Rodar migrations
5. Iniciar desenvolvimento

### Para Customizar
1. Modificar `tailwind.config.ts` para tema
2. Ajustar `prisma/schema.prisma` para dados
3. Configurar APIs em `app/api/`
4. Customizar componentes em `components/`

### Para Deploy
1. Configurar variáveis de produção
2. Build e testar localmente
3. Deploy na Vercel/Render
4. Configurar webhooks e cron jobs

---

**Este documento cobre toda a configuração da LMG Platform para facilitar a comunicação com ChatGPT ou outros assistentes de IA.**
