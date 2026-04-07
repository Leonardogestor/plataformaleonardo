/**
 * Load Test Realista - Simulação de comportamento real de usuários
 * Testa cenários reais: múltiplos usuários, uploads simultâneos, navegação rápida
 */

const puppeteer = require('puppeteer')
const fetch = require('node-fetch')

class RealisticLoadTester {
  constructor(baseUrl, maxUsers = 10) {
    this.baseUrl = baseUrl
    this.maxUsers = maxUsers
    this.browsers = []
    this.results = {
      users: [],
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        errors: []
      }
    }
  }

  async initialize() {
    console.log(`🚀 Inicializando load test para ${this.maxUsers} usuários simultâneos...`)
    
    // Inicializar browsers para cada usuário
    for (let i = 0; i < this.maxUsers; i++) {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      this.browsers.push(browser)
    }
    
    console.log(`✅ ${this.browsers.length} browsers inicializados`)
  }

  async cleanup() {
    for (const browser of this.browsers) {
      await browser.close()
    }
    this.browsers = []
  }

  // Simular comportamento real de usuário
  async simulateUser(userId, userBehavior = 'normal') {
    const browser = this.browsers[userId % this.browsers.length]
    const page = await browser.newPage()
    
    // Configurar viewport mobile/desktop aleatório
    const isMobile = Math.random() > 0.7
    await page.setViewport({
      width: isMobile ? 375 : 1366,
      height: isMobile ? 667 : 768,
      isMobile,
      hasTouch: isMobile
    })

    const userResults = {
      userId,
      behavior: userBehavior,
      startTime: Date.now(),
      actions: [],
      errors: [],
      success: false
    }

    try {
      // 1. Acesso inicial à página
      await this.measureAction(page, userResults, 'page_load', async () => {
        await page.goto(this.baseUrl, { waitUntil: 'networkidle2' })
      })

      // 2. Login (se necessário)
      if (page.url().includes('/login')) {
        await this.measureAction(page, userResults, 'login', async () => {
          await page.type('input[type="email"]', `user${userId}@test.com`)
          await page.type('input[type="password"]', 'test123')
          await page.click('button[type="submit"]')
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 })
        })
      }

      // 3. Comportamento específico baseado no tipo
      switch (userBehavior) {
        case 'power':
          await this.simulatePowerUser(page, userResults)
          break
        case 'casual':
          await this.simulateCasualUser(page, userResults)
          break
        case 'upload_heavy':
          await this.simulateUploadHeavyUser(page, userResults)
          break
        default:
          await this.simulateNormalUser(page, userResults)
      }

      userResults.success = true
      userResults.endTime = Date.now()
      userResults.totalTime = userResults.endTime - userResults.startTime

    } catch (error) {
      userResults.errors.push({
        action: 'general',
        error: error.message,
        timestamp: Date.now()
      })
      userResults.endTime = Date.now()
      userResults.totalTime = userResults.endTime - userResults.startTime
    } finally {
      await page.close()
    }

    return userResults
  }

  // Medir performance de ações
  async measureAction(page, userResults, actionName, actionFn) {
    const startTime = Date.now()
    let success = false
    let error = null

    try {
      await actionFn()
      success = true
    } catch (e) {
      error = e.message
      userResults.errors.push({
        action: actionName,
        error: e.message,
        timestamp: Date.now()
      })
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    userResults.actions.push({
      name: actionName,
      startTime,
      endTime,
      duration,
      success
    })

    // Log em tempo real
    if (success) {
      console.log(`✅ Usuário ${userResults.userId}: ${actionName} (${duration}ms)`)
    } else {
      console.log(`❌ Usuário ${userResults.userId}: ${actionName} falhou - ${error}`)
    }
  }

  // Simular usuário normal (navegação moderada)
  async simulateNormalUser(page, userResults) {
    // Navegação pelo dashboard
    await this.measureAction(page, userResults, 'dashboard_view', async () => {
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 5000 })
    })

    // Pequena pausa simulando tempo de leitura
    await page.waitForTimeout(Math.random() * 2000 + 1000)

    // Visualizar transações
    await this.measureAction(page, userResults, 'transactions_view', async () => {
      await page.click('[data-testid="nav-transactions"]')
      await page.waitForTimeout(1000)
    })

    // Pausa
    await page.waitForTimeout(Math.random() * 1000 + 500)

    // Visualizar dashboard novamente
    await this.measureAction(page, userResults, 'dashboard_return', async () => {
      await page.click('[data-testid="nav-dashboard"]')
      await page.waitForTimeout(500)
    })
  }

  // Simular power user (muitas requisições rápidas)
  async simulatePowerUser(page, userResults) {
    // Navegação rápida entre páginas
    const pages = ['dashboard', 'transactions', 'investments', 'accounts']
    
    for (let i = 0; i < 3; i++) {
      const randomPage = pages[Math.floor(Math.random() * pages.length)]
      
      await this.measureAction(page, userResults, `rapid_nav_${i}`, async () => {
        await page.click(`[data-testid="nav-${randomPage}"]`)
        await page.waitForTimeout(200) // Pausa muito curta
      })
    }

    // Múltiplos refreshes (simulando F5)
    for (let i = 0; i < 2; i++) {
      await this.measureAction(page, userResults, `refresh_${i}`, async () => {
        await page.reload({ waitUntil: 'networkidle2' })
      })
    }
  }

  // Simular usuário casual (poucas interações)
  async simulateCasualUser(page, userResults) {
    // Apenas visualiza dashboard
    await this.measureAction(page, userResults, 'casual_dashboard', async () => {
      await page.waitForTimeout(3000) // Fica na página por 3 segundos
    })

    // Talvez clique em algo
    if (Math.random() > 0.5) {
      await this.measureAction(page, userResults, 'casual_click', async () => {
        await page.click('[data-testid="financial-card"]')
        await page.waitForTimeout(1000)
      })
    }
  }

  // Simular usuário focado em uploads
  async simulateUploadHeavyUser(page, userResults) {
    // Tentar fazer upload de PDF
    await this.measureAction(page, userResults, 'upload_attempt', async () => {
      // Procurar botão de upload
      const uploadButton = await page.$('input[type="file"]')
      
      if (uploadButton) {
        // Criar PDF de teste
        const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000074 00000 n\n0000000120 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF')
        
        await uploadButton.uploadFile({
          buffer: pdfBuffer,
          name: `test-upload-${Date.now()}.pdf`,
          mimeType: 'application/pdf'
        })
        
        // Esperar processamento
        await page.waitForTimeout(5000)
      } else {
        throw new Error('Upload button not found')
      }
    })
  }

  // Executar teste com múltiplos usuários
  async runLoadTest(userCount = 5, behaviorDistribution = {}) {
    console.log(`\n🧪 Iniciando load test com ${userCount} usuários...`)
    
    const defaultDistribution = {
      normal: 0.6,
      power: 0.2,
      casual: 0.15,
      upload_heavy: 0.05
    }
    
    const distribution = { ...defaultDistribution, ...behaviorDistribution }
    
    // Criar array de comportamentos para usuários
    const behaviors = []
    for (let i = 0; i < userCount; i++) {
      const rand = Math.random()
      let cumulative = 0
      
      for (const [behavior, probability] of Object.entries(distribution)) {
        cumulative += probability
        if (rand <= cumulative) {
          behaviors.push(behavior)
          break
        }
      }
    }

    console.log(`📊 Distribuição de usuários:`, 
      Object.entries(behaviors.reduce((acc, b) => {
        acc[b] = (acc[b] || 0) + 1
        return acc
      }, {}))
    )

    // Executar usuários em paralelo
    const startTime = Date.now()
    const userPromises = behaviors.map((behavior, index) => 
      this.simulateUser(index, behavior)
    )

    const userResults = await Promise.all(userPromises)
    const endTime = Date.now()

    // Compilar resultados
    this.results.users = userResults
    this.results.summary.testDuration = endTime - startTime

    this.calculateSummary()
    this.printResults()

    return this.results
  }

  calculateSummary() {
    const allActions = this.results.users.flatMap(u => u.actions)
    const successfulActions = allActions.filter(a => a.success)
    const failedActions = allActions.filter(a => !a.success)

    this.results.summary.totalRequests = allActions.length
    this.results.summary.successfulRequests = successfulActions.length
    this.results.summary.failedRequests = failedActions.length
    this.results.summary.averageResponseTime = successfulActions.length > 0 
      ? Math.round(successfulActions.reduce((sum, a) => sum + a.duration, 0) / successfulActions.length)
      : 0

    // Compilar erros
    this.results.summary.errors = this.results.users
      .flatMap(u => u.errors)
      .reduce((acc, error) => {
        const key = `${error.action}: ${error.error}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {})

    // Taxa de sucesso
    this.results.summary.successRate = Math.round(
      (this.results.summary.successfulRequests / this.results.summary.totalRequests) * 100
    )
  }

  printResults() {
    console.log('\n📊 RESULTADOS DO LOAD TEST')
    console.log('=' .repeat(50))
    
    console.log(`\n👥 Usuários testados: ${this.results.users.length}`)
    console.log(`⏱️ Duração total: ${Math.round(this.results.summary.testDuration / 1000)}s`)
    console.log(`\n📈 Requisições:`)
    console.log(`   Total: ${this.results.summary.totalRequests}`)
    console.log(`   Sucesso: ${this.results.summary.successfulRequests} (${this.results.summary.successRate}%)`)
    console.log(`   Falhas: ${this.results.summary.failedRequests}`)
    console.log(`   Tempo médio: ${this.results.summary.averageResponseTime}ms`)

    // Performance por tipo de usuário
    console.log(`\n👤 Performance por comportamento:`)
    const behaviorStats = this.results.users.reduce((acc, user) => {
      if (!acc[user.behavior]) {
        acc[user.behavior] = {
          count: 0,
          successRate: 0,
          avgTime: 0,
          errors: 0
        }
      }
      
      acc[user.behavior].count++
      acc[user.behavior].successRate += user.success ? 1 : 0
      acc[user.behavior].avgTime += user.totalTime
      acc[user.behavior].errors += user.errors.length
      
      return acc
    }, {})

    for (const [behavior, stats] of Object.entries(behaviorStats)) {
      const successRate = Math.round((stats.successRate / stats.count) * 100)
      const avgTime = Math.round(stats.avgTime / stats.count)
      
      console.log(`   ${behavior}: ${stats.count} usuários, ${successRate}% sucesso, ${avgTime}ms avg, ${stats.errors} erros`)
    }

    // Erros mais comuns
    if (Object.keys(this.results.summary.errors).length > 0) {
      console.log(`\n❌ Erros mais comuns:`)
      const sortedErrors = Object.entries(this.results.summary.errors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
      
      for (const [error, count] of sortedErrors) {
        console.log(`   ${count}x: ${error}`)
      }
    }

    // Recomendações
    console.log(`\n💡 RECOMENDAÇÕES:`)
    
    if (this.results.summary.successRate < 90) {
      console.log(`   ⚠️ Taxa de sucesso baixa (${this.results.summary.successRate}%) - investigar erros`)
    }
    
    if (this.results.summary.averageResponseTime > 3000) {
      console.log(`   ⚠️ Tempo de resposta alto (${this.results.summary.averageResponseTime}ms) - otimizar performance`)
    }
    
    if (this.results.summary.failedRequests > 10) {
      console.log(`   ⚠️ Muitas falhas (${this.results.summary.failedRequests}) - verificar estabilidade`)
    }

    const powerUserStats = behaviorStats.power
    if (powerUserStats && powerUserStats.successRate < 80) {
      console.log(`   ⚠️ Power users com problemas (${powerUserStats.successRate}% sucesso) - verificar rate limiting`)
    }

    console.log('\n' + '=' .repeat(50))
  }

  // Teste de estresse gradual
  async runStressTest(maxUsers = 10, stepSize = 2) {
    console.log(`\n🔥 Iniciando stress test gradual até ${maxUsers} usuários...`)
    
    for (let users = stepSize; users <= maxUsers; users += stepSize) {
      console.log(`\n--- Testando com ${users} usuários ---`)
      
      const results = await this.runLoadTest(users)
      
      // Se performance degradar muito, parar
      if (results.summary.successRate < 70) {
        console.log(`⚠️ Performance degradou muito (${results.summary.successRate}% sucesso) - parando teste`)
        break
      }
      
      // Pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
}

// Função principal
async function runRealisticLoadTest() {
  const baseUrl = process.argv[2]
  const maxUsers = parseInt(process.argv[3]) || 5
  const testType = process.argv[4] || 'normal'

  if (!baseUrl) {
    console.error('❌ URL da aplicação não fornecida')
    console.log('Uso: node scripts/load-test-realistic.js https://sua-url.vercel.app [maxUsers] [testType]')
    console.log('Test types: normal, stress, upload_heavy')
    process.exit(1)
  }

  const tester = new RealisticLoadTester(baseUrl, maxUsers)

  try {
    await tester.initialize()

    switch (testType) {
      case 'stress':
        await tester.runStressTest(maxUsers, 2)
        break
      case 'upload_heavy':
        await tester.runLoadTest(maxUsers, { upload_heavy: 0.8, normal: 0.2 })
        break
      default:
        await tester.runLoadTest(maxUsers)
    }

  } catch (error) {
    console.error('❌ Erro no load test:', error)
  } finally {
    await tester.cleanup()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runRealisticLoadTest()
}

module.exports = { RealisticLoadTester }
