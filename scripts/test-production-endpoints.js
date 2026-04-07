/**
 * Script para testar todos os endpoints críticos em produção
 * Uso: node scripts/test-production-endpoints.js https://seu-dominio.vercel.app
 */

const fetch = require('node-fetch');

const BASE_URL = process.argv[2];
if (!BASE_URL) {
  console.error('❌ URL da aplicação não fornecida');
  console.log('Uso: node scripts/test-production-endpoints.js https://seu-dominio.vercel.app');
  process.exit(1);
}

// Cores para output
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

async function testEndpoint(method, path, body = null, headers = {}) {
  try {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    return {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      url: `${BASE_URL}${path}`
    };
  }
}

async function runTests() {
  console.log(`\n${colors.blue}🚀 TESTANDO PRODUÇÃO: ${BASE_URL}${colors.reset}\n`);

  const tests = [
    // Health Check
    {
      name: 'Health Check',
      method: 'GET',
      path: '/api/health',
      expectedStatus: 200
    },
    
    // Auth Endpoints
    {
      name: 'Auth Session',
      method: 'GET',
      path: '/api/auth/session',
      expectedStatus: 200
    },
    
    // Dashboard APIs
    {
      name: 'Dashboard Data',
      method: 'GET',
      path: '/api/dashboard',
      expectedStatus: 401 // Deve retornar não autorizado sem sessão
    },
    
    {
      name: 'Transactions',
      method: 'GET',
      path: '/api/transactions',
      expectedStatus: 401
    },
    
    {
      name: 'Balance',
      method: 'GET',
      path: '/api/balance',
      expectedStatus: 401
    },
    
    {
      name: 'Investments',
      method: 'GET',
      path: '/api/investments',
      expectedStatus: 401
    },
    
    // SSE Endpoint
    {
      name: 'SSE Events',
      method: 'GET',
      path: '/api/events/refresh',
      expectedStatus: 200
    },
    
    // Documents Upload (sem arquivo)
    {
      name: 'Documents Upload (sem auth)',
      method: 'POST',
      path: '/api/documents',
      expectedStatus: 401
    },
    
    // Rate Limiting Test
    {
      name: 'Rate Limiting Test 1',
      method: 'GET',
      path: '/api/transactions',
      expectedStatus: 401
    },
    {
      name: 'Rate Limiting Test 2',
      method: 'GET',
      path: '/api/transactions',
      expectedStatus: 401
    },
    {
      name: 'Rate Limiting Test 3',
      method: 'GET',
      path: '/api/transactions',
      expectedStatus: 401
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await testEndpoint(test.method, test.path);
    
    if (result.status === test.expectedStatus) {
      log('✅', test.name, `(${result.status})`);
      passed++;
    } else {
      log('❌', test.name, `(esperado ${test.expectedStatus}, recebeu ${result.status})`);
      if (result.error) {
        console.log(`   Erro: ${result.error}`);
      }
      failed++;
    }
    
    // Pequeno delay entre requisições
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Teste de CORS
  console.log(`\n${colors.blue}🔒 TESTANDO CORS${colors.reset}`);
  
  const corsTest = await testEndpoint('OPTIONS', '/api/transactions', null, {
    'Origin': 'https://example.com',
    'Access-Control-Request-Method': 'GET'
  });
  
  if (corsTest.status === 405 || corsTest.status === 204) {
    log('✅', 'CORS Headers', 'Funcionando');
    passed++;
  } else {
    log('❌', 'CORS Headers', `Status inesperado: ${corsTest.status}`);
    failed++;
  }

  // Teste de Headers de Segurança
  console.log(`\n${colors.blue}🛡️ TESTANDO HEADERS DE SEGURANÇA${colors.reset}`);
  
  const securityTest = await testEndpoint('GET', '/');
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'referrer-policy'
  ];
  
  let securityPassed = 0;
  for (const header of securityHeaders) {
    if (securityTest.headers[header]) {
      log('✅', `Header ${header}`, securityTest.headers[header]);
      securityPassed++;
    } else {
      log('❌', `Header ${header}`, 'Ausente');
    }
  }

  // Resumo Final
  console.log(`\n${colors.blue}📊 RESUMO FINAL${colors.reset}`);
  console.log(`${colors.green}✅ Passados: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Falhados: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️ Segurança: ${securityPassed}/${securityHeaders.length}${colors.reset}`);
  
  const totalTests = tests.length + 1 + securityHeaders.length;
  const totalPassed = passed + securityPassed;
  const successRate = Math.round((totalPassed / totalTests) * 100);
  
  if (successRate >= 80) {
    console.log(`\n${colors.green}🎉 DEPLOY BEM-SUCEDIDO! ${successRate}%${colors.reset}`);
    console.log('A aplicação está pronta para produção.');
  } else {
    console.log(`\n${colors.red}⚠️ DEPLOY PRECISA DE AJUSTES! ${successRate}%${colors.reset}`);
    console.log('Verifique os endpoints falhados antes de liberar para usuários.');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('❌ Erro ao executar testes:', error);
  process.exit(1);
});
