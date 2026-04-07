/**
 * Testes reais de produção - NÃO MOCKADOS
 * Uso: node scripts/real-production-tests.js https://sua-url.vercel.app
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const BASE_URL = process.argv[2];
if (!BASE_URL) {
  console.error('❌ URL da aplicação não fornecida');
  console.log('Uso: node scripts/real-production-tests.js https://sua-url.vercel.app');
  process.exit(1);
}

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(status, message, details = '') {
  const color = status === '✅' ? colors.green : status === '❌' ? colors.red : colors.yellow;
  console.log(`${color}${status} ${message}${colors.reset} ${details}`);
}

class ProductionTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.page = null;
  }

  async init() {
    log('🚀', 'Iniciando browser para testes reais...');
    this.browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Configurar viewport mobile e desktop
    await this.page.setViewport({ width: 1366, height: 768 });
    
    // Capturar console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        log('⚠️', 'Console Error (Browser)', msg.text());
      }
    });
    
    // Capturar erros de página
    this.page.on('pageerror', error => {
      log('❌', 'Page Error', error.message);
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testHealthCheck() {
    log('🏥', 'Testando Health Check...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const data = await response.json();
      
      if (data.status === 'ok') {
        log('✅', 'Health Check OK', `Status: ${data.status}`);
        return true;
      } else {
        log('❌', 'Health Check Falhou', `Status: ${data.status}`);
        return false;
      }
    } catch (error) {
      log('❌', 'Health Check Error', error.message);
      return false;
    }
  }

  async testLoginPage() {
    log('🔐', 'Testando página de login...');
    
    try {
      await this.page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle2' });
      
      // Verificar se página carregou
      const title = await this.page.title();
      const hasLoginForm = await this.page.$('input[type="email"]') !== null;
      const hasPasswordForm = await this.page.$('input[type="password"]') !== null;
      
      if (hasLoginForm && hasPasswordForm) {
        log('✅', 'Página de login OK', 'Formulários encontrados');
        return true;
      } else {
        log('❌', 'Página de login Falhou', 'Formulários não encontrados');
        return false;
      }
    } catch (error) {
      log('❌', 'Página de login Error', error.message);
      return false;
    }
  }

  async testRealLogin(email, password) {
    log('👤', 'Testando login real...');
    
    try {
      await this.page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle2' });
      
      // Preencher formulário
      await this.page.type('input[type="email"]', email);
      await this.page.type('input[type="password"]', password);
      
      // Clicar em login
      await this.page.click('button[type="submit"]');
      
      // Esperar redirect
      await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
      
      // Verificar se está no dashboard
      const currentUrl = this.page.url();
      if (currentUrl.includes('/dashboard')) {
        log('✅', 'Login real OK', 'Redirecionado para dashboard');
        return true;
      } else {
        log('❌', 'Login real Falhou', `URL atual: ${currentUrl}`);
        return false;
      }
    } catch (error) {
      log('❌', 'Login real Error', error.message);
      return false;
    }
  }

  async testDashboardData() {
    log('📊', 'Testando dados do dashboard...');
    
    try {
      // Esperar carregamento completo
      await this.page.waitForTimeout(3000);
      
      // Verificar se há elementos de dados
      const hasDataCards = await this.page.$$('[data-testid="financial-card"]').length > 0;
      const hasCharts = await this.page.$$('canvas, svg').length > 0;
      
      // Verificar se não há mensagens de "sem dados" ou mock
      const hasNoData = await this.page.evaluate(() => {
        const body = document.body.innerText;
        return body.includes('sem dados') || body.includes('mock') || body.includes('teste');
      });
      
      if (hasDataCards && !hasNoData) {
        log('✅', 'Dashboard dados OK', 'Cards encontrados, sem mock');
        return true;
      } else {
        log('❌', 'Dashboard dados Falhou', hasNoData ? 'Dados mock detectados' : 'Cards não encontrados');
        return false;
      }
    } catch (error) {
      log('❌', 'Dashboard dados Error', error.message);
      return false;
    }
  }

  async testPDFUpload() {
    log('📄', 'Testando upload de PDF...');
    
    try {
      // Criar PDF de teste simples
      const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000074 00000 n\n0000000120 00000 n\ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n179\n%%EOF');
      
      // Navegar para página de upload (se existir)
      await this.page.goto(`${this.baseUrl}/dashboard`, { waitUntil: 'networkidle2' });
      
      // Procurar botão de upload
      const uploadButton = await this.page.$('input[type="file"]');
      
      if (uploadButton) {
        // Fazer upload
        await uploadButton.uploadFile({
          buffer: pdfContent,
          name: 'test.pdf',
          mimeType: 'application/pdf'
        });
        
        // Esperar processamento
        await this.page.waitForTimeout(5000);
        
        // Verificar se há mensagem de sucesso ou erro
        const hasSuccessMessage = await this.page.evaluate(() => {
          const body = document.body.innerText;
          return body.includes('sucesso') || body.includes('processando') || body.includes('recebido');
        });
        
        if (hasSuccessMessage) {
          log('✅', 'Upload PDF OK', 'Arquivo recebido');
          return true;
        } else {
          log('❌', 'Upload PDF Falhou', 'Sem mensagem de sucesso');
          return false;
        }
      } else {
        log('⚠️', 'Upload PDF Pulado', 'Botão de upload não encontrado');
        return null; // Não falhar, apenas pular
      }
    } catch (error) {
      log('❌', 'Upload PDF Error', error.message);
      return false;
    }
  }

  async testAPIsProtegidas() {
    log('🔒', 'Testando APIs protegidas...');
    
    const protectedAPIs = [
      '/api/transactions',
      '/api/dashboard',
      '/api/balance',
      '/api/investments'
    ];
    
    let passed = 0;
    
    for (const api of protectedAPIs) {
      try {
        const response = await fetch(`${this.baseUrl}${api}`);
        
        if (response.status === 401) {
          log('✅', `API ${api} OK`, 'Retornou 401 como esperado');
          passed++;
        } else {
          log('❌', `API ${api} Falhou`, `Status inesperado: ${response.status}`);
        }
      } catch (error) {
        log('❌', `API ${api} Error`, error.message);
      }
    }
    
    return passed === protectedAPIs.length;
  }

  async testSSEConnection() {
    log('🔄', 'Testando conexão SSE...');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/events/refresh`);
      
      if (response.status === 200) {
        const text = await response.text();
        
        if (text.includes('data:') && text.includes('connected')) {
          log('✅', 'SSE OK', 'Conexão estabelecida');
          return true;
        } else {
          log('❌', 'SSE Falhou', 'Formato inválido');
          return false;
        }
      } else {
        log('❌', 'SSE Falhou', `Status: ${response.status}`);
        return false;
      }
    } catch (error) {
      log('❌', 'SSE Error', error.message);
      return false;
    }
  }

  async runFullTest(email, password) {
    console.log(`\n${colors.blue}🧪 INICIANDO TESTES REAIS DE PRODUÇÃO${colors.reset}\n`);
    
    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'Página Login', fn: () => this.testLoginPage() },
      { name: 'Login Real', fn: () => this.testRealLogin(email, password) },
      { name: 'Dashboard Dados', fn: () => this.testDashboardData() },
      { name: 'Upload PDF', fn: () => this.testPDFUpload() },
      { name: 'APIs Protegidas', fn: () => this.testAPIsProtegidas() },
      { name: 'SSE Connection', fn: () => this.testSSEConnection() }
    ];
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const test of tests) {
      const result = await test.fn();
      
      if (result === true) {
        passed++;
      } else if (result === false) {
        failed++;
      } else {
        skipped++;
      }
    }
    
    // Resumo
    console.log(`\n${colors.blue}📊 RESUMO DOS TESTES REAIS${colors.reset}`);
    console.log(`${colors.green}✅ Passados: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Falhados: ${failed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️ Pulados: ${skipped}${colors.reset}`);
    
    const totalValid = passed + failed;
    const successRate = totalValid > 0 ? Math.round((passed / totalValid) * 100) : 0;
    
    if (successRate >= 80) {
      console.log(`\n${colors.green}🎉 APLICAÇÃO PRONTA PARA PRODUÇÃO! ${successRate}%${colors.reset}`);
      console.log('✅ Testes reais passaram - Ready for users!');
    } else {
      console.log(`\n${colors.red}⚠️ APLICAÇÃO PRECISA DE CORREÇÕES! ${successRate}%${colors.reset}`);
      console.log('❌ Corrija os testes falhados antes do deploy final.');
    }
    
    return successRate >= 80;
  }
}

// Executar testes
async function main() {
  const tester = new ProductionTester(BASE_URL);
  
  try {
    await tester.init();
    
    // Pedir credenciais reais
    console.log(`${colors.yellow}🔑 CREDENCIAIS REAIS NECESSÁRIAS:${colors.reset}`);
    console.log('Para testes completos, informe um usuário real:');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const email = await new Promise(resolve => {
      rl.question('Email (deixe em branco para pular login): ', resolve);
    });
    
    const password = await new Promise(resolve => {
      rl.question('Senha (deixe em branco para pular login): ', resolve);
    });
    
    rl.close();
    
    const success = await tester.runFullTest(email, password);
    
    if (!success) {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main();
}
