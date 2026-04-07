/**
 * Simulação da Experiência do Primeiro Usuário Real
 * 5-10 usuários simultâneos, múltiplos uploads, navegação rápida
 */

const puppeteer = require('puppeteer')
const { performance } = require('perf_hooks')

// Configurações da simulação
const SIMULATION_CONFIG = {
  users: 8,
  duration: 60000, // 1 minuto
  baseUrl: 'https://sua-url.vercel.app', // Substituir pela URL real
  headless: true,
  slowMo: 100, // Simular humano
  viewport: { width: 1366, height: 768 }
}

// Perfis de usuário
const USER_PROFILES = [
  {
    name: 'Power User',
    behavior: 'fast',
    actions: ['dashboard', 'upload_pdf', 'ai_analysis', 'sync', 'dashboard'],
    thinkTime: { min: 500, max: 2000 },
    errors: 0.05 // 5% chance de erro
  },
  {
    name: 'Normal User',
    behavior: 'normal',
    actions: ['dashboard', 'upload_pdf', 'dashboard'],
    thinkTime: { min: 2000, max: 5000 },
    errors: 0.02 // 2% chance de erro
  },
  {
    name: 'Cautious User',
    behavior: 'slow',
    actions: ['dashboard', 'dashboard', 'upload_pdf', 'dashboard'],
    thinkTime: { min: 3000, max: 8000 },
    errors: 0.01 // 1% chance de erro
  },
  {
    name: 'Upload Heavy',
    behavior: 'upload_focused',
    actions: ['upload_pdf', 'upload_pdf', 'dashboard', 'upload_pdf'],
    thinkTime: { min: 1000, max: 3000 },
    errors: 0.08 // 8% chance de erro
  },
  {
    name: 'Explorer',
    behavior: 'exploratory',
    actions: ['dashboard', 'ai_analysis', 'sync', 'upload_pdf', 'dashboard', 'dashboard'],
    thinkTime: { min: 1500, max: 4000 },
    errors: 0.03 // 3% chance de erro
  }
]

// Resultados da simulação
const simulationResults = {
  users: [],
  metrics: {
    totalActions: 0,
    successfulActions: 0,
    failedActions: 0,
    averageResponseTime: 0,
    userFrustration: 0,
    systemErrors: [],
    userFeedback: []
  },
  timeline: []
}

class UserSimulator {
  constructor(userId, profile, browser) {
    this.userId = userId
    this.profile = profile
    this.browser = browser
    this.page = null
    this.actions = []
    this.frustration = 0
    this.errors = []
    this.startTime = Date.now()
  }

  async initialize() {
    this.page = await this.browser.newPage()
    await this.page.setViewport(SIMULATION_CONFIG.viewport)
    
    // Simular fingerprints únicos
    await this.page.setUserAgent(`UserSimulator-${this.userId}`)
    
    console.log(`[User ${this.userId}] ${this.profile.name} initialized`)
  }

  async simulate() {
    try {
      // Login (simulado)
      await this.login()
      
      // Executar ações baseado no perfil
      for (const action of this.profile.actions) {
        await this.executeAction(action)
        await this.think()
      }
      
      // Continuar ações durante o período de simulação
      while (Date.now() - this.startTime < SIMULATION_CONFIG.duration) {
        const randomAction = this.profile.actions[Math.floor(Math.random() * this.profile.actions.length)]
        await this.executeAction(randomAction)
        await this.think()
      }
      
    } catch (error) {
      this.recordError('Simulation error', error)
    } finally {
      await this.cleanup()
    }
  }

  async login() {
    const startTime = performance.now()
    
    try {
      await this.page.goto(`${SIMULATION_CONFIG.baseUrl}/login`, { waitUntil: 'networkidle2' })
      
      // Preencher formulário de login
      await this.page.type('#email', `user${this.userId}@example.com`)
      await this.page.type('#password', 'password123')
      
      // Clicar em login
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click('button[type="submit"]')
      ])
      
      const responseTime = performance.now() - startTime
      this.recordAction('login', true, responseTime)
      
      console.log(`[User ${this.userId}] Login successful (${responseTime.toFixed(0)}ms)`)
      
    } catch (error) {
      const responseTime = performance.now() - startTime
      this.recordAction('login', false, responseTime)
      this.recordError('Login failed', error)
      throw error
    }
  }

  async executeAction(action) {
    const startTime = performance.now()
    let success = false
    let error = null
    
    try {
      switch (action) {
        case 'dashboard':
          success = await this.visitDashboard()
          break
        case 'upload_pdf':
          success = await this.uploadPDF()
          break
        case 'ai_analysis':
          success = await this.performAIAnalysis()
          break
        case 'sync':
          success = await this.syncData()
          break
        default:
          console.warn(`[User ${this.userId}] Unknown action: ${action}`)
          success = true
      }
      
      const responseTime = performance.now() - startTime
      this.recordAction(action, success, responseTime)
      
      if (!success) {
        this.frustration += 10
      }
      
    } catch (error) {
      const responseTime = performance.now() - startTime
      this.recordAction(action, false, responseTime)
      this.recordError(`Action ${action} failed`, error)
      this.frustration += 15
    }
  }

  async visitDashboard() {
    try {
      await this.page.goto(`${SIMULATION_CONFIG.baseUrl}/dashboard`, { waitUntil: 'networkidle2' })
      
      // Verificar se dashboard carregou
      await this.page.waitForSelector('[data-testid="dashboard-container"]', { timeout: 5000 })
      
      // Verificar elementos principais
      const elements = await this.page.$$('[data-testid^="dashboard-"]')
      
      if (elements.length === 0) {
        throw new Error('Dashboard elements not found')
      }
      
      // Simular leitura do dashboard
      await this.page.waitForTimeout(1000)
      
      return true
      
    } catch (error) {
      console.error(`[User ${this.userId}] Dashboard error:`, error.message)
      return false
    }
  }

  async uploadPDF() {
    try {
      await this.page.goto(`${SIMULATION_CONFIG.baseUrl}/upload`, { waitUntil: 'networkidle2' })
      
      // Verificar se página de upload carregou
      await this.page.waitForSelector('[data-testid="upload-area"]', { timeout: 5000 })
      
      // Simular upload de arquivo
      const fileInput = await this.page.$('input[type="file"]')
      if (!fileInput) {
        throw new Error('File input not found')
      }
      
      // Criar arquivo PDF simulado
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n')
      
      await fileInput.uploadFile({
        fileName: `test-${this.userId}-${Date.now()}.pdf`,
        mimeType: 'application/pdf',
        buffer: pdfBuffer
      })
      
      // Aguardar processamento
      await this.page.waitForSelector('[data-testid="upload-status"]', { timeout: 10000 })
      
      // Verificar status
      const status = await this.page.$eval('[data-testid="upload-status"]', el => el.textContent)
      
      if (status && status.includes('failed')) {
        throw new Error('Upload failed')
      }
      
      return true
      
    } catch (error) {
      console.error(`[User ${this.userId}] Upload error:`, error.message)
      return false
    }
  }

  async performAIAnalysis() {
    try {
      await this.page.goto(`${SIMULATION_CONFIG.baseUrl}/analysis`, { waitUntil: 'networkidle2' })
      
      // Verificar se página de análise carregou
      await this.page.waitForSelector('[data-testid="analysis-form"]', { timeout: 5000 })
      
      // Preencher formulário de análise
      await this.page.type('[data-testid="analysis-input"]', `Analyze data for user ${this.userId}`)
      
      // Submeter análise
      await this.page.click('[data-testid="analyze-button"]')
      
      // Aguardar resultado
      await this.page.waitForSelector('[data-testid="analysis-result"]', { timeout: 15000 })
      
      // Verificar se há resultado
      const result = await this.page.$eval('[data-testid="analysis-result"]', el => el.textContent)
      
      if (!result || result.includes('error')) {
        throw new Error('Analysis failed')
      }
      
      return true
      
    } catch (error) {
      console.error(`[User ${this.userId}] Analysis error:`, error.message)
      return false
    }
  }

  async syncData() {
    try {
      await this.page.goto(`${SIMULATION_CONFIG.baseUrl}/sync`, { waitUntil: 'networkidle2' })
      
      // Verificar se página de sync carregou
      await this.page.waitForSelector('[data-testid="sync-controls"]', { timeout: 5000 })
      
      // Iniciar sincronização
      await this.page.click('[data-testid="sync-button"]')
      
      // Aguardar status
      await this.page.waitForSelector('[data-testid="sync-status"]', { timeout: 20000 })
      
      // Verificar se completou
      const status = await this.page.$eval('[data-testid="sync-status"]', el => el.textContent)
      
      if (status && status.includes('failed')) {
        throw new Error('Sync failed')
      }
      
      return true
      
    } catch (error) {
      console.error(`[User ${this.userId}] Sync error:`, error.message)
      return false
    }
  }

  async think() {
    const thinkTime = this.profile.thinkTime.min + 
      Math.random() * (this.profile.thinkTime.max - this.profile.thinkTime.min)
    
    await this.page.waitForTimeout(thinkTime)
  }

  recordAction(action, success, responseTime) {
    this.actions.push({
      action,
      success,
      responseTime,
      timestamp: Date.now()
    })
    
    // Adicionar ao timeline global
    simulationResults.timeline.push({
      userId: this.userId,
      action,
      success,
      responseTime,
      timestamp: Date.now()
    })
  }

  recordError(type, error) {
    this.errors.push({
      type,
      error: error.message,
      timestamp: Date.now()
    })
    
    simulationResults.metrics.systemErrors.push({
      userId: this.userId,
      type,
      error: error.message,
      timestamp: Date.now()
    })
  }

  async cleanup() {
    if (this.page) {
      await this.page.close()
    }
    
    // Calcular frustração final
    const errorRate = this.errors.length / this.actions.length
    const avgResponseTime = this.actions.reduce((sum, a) => sum + a.responseTime, 0) / this.actions.length
    
    if (errorRate > 0.1) this.frustration += 20
    if (avgResponseTime > 5000) this.frustration += 15
    if (this.errors.length > 3) this.frustration += 10
    
    this.frustration = Math.min(100, this.frustration)
    
    console.log(`[User ${this.userId}] Final frustration: ${this.frustration}%`)
  }

  getResults() {
    return {
      userId: this.userId,
      profile: this.profile.name,
      actions: this.actions.length,
      errors: this.errors.length,
      frustration: this.frustration,
      avgResponseTime: this.actions.reduce((sum, a) => sum + a.responseTime, 0) / this.actions.length,
      successRate: this.actions.filter(a => a.success).length / this.actions.length
    }
  }
}

// Função principal de simulação
async function runFirstUserExperienceSimulation() {
  console.log('🚀 Starting First User Experience Simulation...')
  console.log(`Users: ${SIMULATION_CONFIG.users}`)
  console.log(`Duration: ${SIMULATION_CONFIG.duration}ms`)
  console.log(`Base URL: ${SIMULATION_CONFIG.baseUrl}`)
  
  const browser = await puppeteer.launch({
    headless: SIMULATION_CONFIG.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  try {
    // Criar usuários com perfis variados
    const users = []
    for (let i = 0; i < SIMULATION_CONFIG.users; i++) {
      const profile = USER_PROFILES[i % USER_PROFILES.length]
      const user = new UserSimulator(i + 1, profile, browser)
      users.push(user)
    }
    
    // Inicializar todos os usuários
    await Promise.all(users.map(user => user.initialize()))
    
    // Iniciar simulação
    console.log('📊 Starting simulation...')
    const startTime = Date.now()
    
    await Promise.all(users.map(user => user.simulate()))
    
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    
    // Coletar resultados
    const userResults = users.map(user => user.getResults())
    simulationResults.users = userResults
    
    // Calcular métricas globais
    const allActions = userResults.flatMap(u => u.actions || [])
    const successfulActions = allActions.filter(a => a.success).length
    const failedActions = allActions.length - successfulActions
    const avgResponseTime = allActions.reduce((sum, a) => sum + a.responseTime, 0) / allActions.length
    const avgFrustration = userResults.reduce((sum, u) => sum + u.frustration, 0) / userResults.length
    
    simulationResults.metrics = {
      totalActions: allActions.length,
      successfulActions,
      failedActions,
      averageResponseTime: avgResponseTime,
      userFrustration: avgFrustration,
      systemErrors: simulationResults.metrics.systemErrors,
      userFeedback: generateUserFeedback(userResults)
    }
    
    // Exibir resultados
    displayResults(totalDuration)
    
    // Gerar relatório
    generateReport()
    
  } catch (error) {
    console.error('Simulation error:', error)
  } finally {
    await browser.close()
  }
}

// Gerar feedback dos usuários
function generateUserFeedback(userResults) {
  const feedback = []
  
  userResults.forEach(user => {
    if (user.frustration > 70) {
      feedback.push({
        userId: user.userId,
        type: 'frustration',
        message: `User ${user.userId} (${user.profile}) reported high frustration (${user.frustration}%)`,
        reasons: getUserFrustrationReasons(user)
      })
    }
    
    if (user.successRate < 0.8) {
      feedback.push({
        userId: user.userId,
        type: 'reliability',
        message: `User ${user.userId} (${user.profile}) experienced low success rate (${(user.successRate * 100).toFixed(1)}%)`,
        details: `${user.errors} errors out of ${user.actions} actions`
      })
    }
    
    if (user.avgResponseTime > 5000) {
      feedback.push({
        userId: user.userId,
        type: 'performance',
        message: `User ${user.userId} (${user.profile}) experienced slow responses (${user.avgResponseTime.toFixed(0)}ms avg)`,
        impact: 'May perceive system as slow or broken'
      })
    }
  })
  
  return feedback
}

// Identificar razões de frustração
function getUserFrustrationReasons(user) {
  const reasons = []
  
  if (user.errors > 3) {
    reasons.push('Multiple errors encountered')
  }
  
  if (user.avgResponseTime > 5000) {
    reasons.push('Slow response times')
  }
  
  if (user.successRate < 0.7) {
    reasons.push('Low success rate')
  }
  
  if (user.profile.behavior === 'fast' && user.avgResponseTime > 3000) {
    reasons.push('Fast user experiencing slow system')
  }
  
  return reasons
}

// Exibir resultados
function displayResults(duration) {
  console.log('\n📊 SIMULATION RESULTS')
  console.log('=' .repeat(50))
  console.log(`Duration: ${duration}ms`)
  console.log(`Users: ${simulationResults.users.length}`)
  console.log(`Total Actions: ${simulationResults.metrics.totalActions}`)
  console.log(`Success Rate: ${((simulationResults.metrics.successfulActions / simulationResults.metrics.totalActions) * 100).toFixed(1)}%`)
  console.log(`Avg Response Time: ${simulationResults.metrics.averageResponseTime.toFixed(0)}ms`)
  console.log(`Avg Frustration: ${simulationResults.metrics.userFrustration.toFixed(1)}%`)
  console.log(`System Errors: ${simulationResults.metrics.systemErrors.length}`)
  
  console.log('\n👥 USER BREAKDOWN')
  simulationResults.users.forEach(user => {
    console.log(`User ${user.userId} (${user.profile}):`)
    console.log(`  Actions: ${user.actions}`)
    console.log(`  Success Rate: ${(user.successRate * 100).toFixed(1)}%`)
    console.log(`  Frustration: ${user.frustration}%`)
    console.log(`  Avg Response: ${user.avgResponseTime.toFixed(0)}ms`)
  })
  
  console.log('\n⚠️ USER FEEDBACK')
  simulationResults.metrics.userFeedback.forEach(feedback => {
    console.log(`${feedback.type.toUpperCase()}: ${feedback.message}`)
    if (feedback.reasons) {
      console.log(`  Reasons: ${feedback.reasons.join(', ')}`)
    }
  })
}

// Gerar relatório detalhado
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    config: SIMULATION_CONFIG,
    results: simulationResults,
    analysis: {
      overallExperience: simulationResults.metrics.userFrustration < 30 ? 'good' : 
                         simulationResults.metrics.userFrustration < 60 ? 'fair' : 'poor',
      systemReliability: (simulationResults.metrics.successfulActions / simulationResults.metrics.totalActions) * 100,
      performanceLevel: simulationResults.metrics.averageResponseTime < 2000 ? 'excellent' :
                        simulationResults.metrics.averageResponseTime < 5000 ? 'good' :
                        simulationResults.metrics.averageResponseTime < 8000 ? 'fair' : 'poor',
      criticalIssues: simulationResults.metrics.userFeedback.filter(f => f.type === 'frustration'),
      recommendations: generateRecommendations()
    }
  }
  
  // Salvar relatório
  const fs = require('fs')
  fs.writeFileSync('first-user-experience-report.json', JSON.stringify(report, null, 2))
  
  console.log('\n📄 Report saved to: first-user-experience-report.json')
}

// Gerar recomendações
function generateRecommendations() {
  const recommendations = []
  
  if (simulationResults.metrics.userFrustration > 50) {
    recommendations.push('High user frustration detected - investigate slow operations and errors')
  }
  
  if (simulationResults.metrics.averageResponseTime > 5000) {
    recommendations.push('Slow response times - optimize performance or add loading indicators')
  }
  
  if (simulationResults.metrics.successfulActions / simulationResults.metrics.totalActions < 0.9) {
    recommendations.push('Low success rate - improve error handling and reliability')
  }
  
  const criticalIssues = simulationResults.metrics.userFeedback.filter(f => f.type === 'frustration')
  if (criticalIssues.length > 0) {
    recommendations.push(`${criticalIssues.length} users reported high frustration - immediate attention needed`)
  }
  
  return recommendations
}

// Executar simulação
if (require.main === module) {
  runFirstUserExperienceSimulation().catch(console.error)
}

module.exports = {
  runFirstUserExperienceSimulation,
  SIMULATION_CONFIG
}
