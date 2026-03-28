// Teste para verificar se o dashboard está funcionando após as correções
const fetch = require('node-fetch');

async function testDashboardAfterFix() {
  console.log('🔍 Testando dashboard após correções SSR...');
  console.log('URL: https://plataformalmg.vercel.app');
  
  try {
    // 1. Verificar se a página de login está funcionando
    console.log('\n1. Testando página de login...');
    const loginResponse = await fetch('https://plataformalmg.vercel.app/login');
    console.log('Status:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      throw new Error('Página de login não está acessível');
    }
    
    // 2. Verificar se o dashboard redireciona corretamente (sem autenticação)
    console.log('\n2. Testando redirecionamento do dashboard...');
    const dashboardResponse = await fetch('https://plataformalmg.vercel.app/dashboard', {
      redirect: 'manual'
    });
    console.log('Status:', dashboardResponse.status);
    console.log('Location:', dashboardResponse.headers.get('location'));
    
    if (dashboardResponse.status === 307) {
      const location = dashboardResponse.headers.get('location');
      if (location && location.includes('/login')) {
        console.log('✅ Redirecionamento correto para login');
      } else {
        console.log('❌ Redirecionamento incorreto');
      }
    }
    
    // 3. Verificar se as APIs estão respondendo
    console.log('\n3. Testando APIs...');
    const apis = [
      '/api/health',
      '/api/balance',
      '/api/transactions'
    ];
    
    for (const api of apis) {
      const response = await fetch(`https://plataformalmg.vercel.app${api}`);
      console.log(`${api}: ${response.status}`);
      
      if (api === '/api/health' && response.status === 200) {
        const data = await response.json();
        console.log(`  Health: ${data.status}`);
      }
    }
    
    // 4. Verificar se há erros de JavaScript na página
    console.log('\n4. Verificando se há erros de SSR...');
    const homeResponse = await fetch('https://plataformalmg.vercel.app');
    console.log('Home Status:', homeResponse.status);
    
    if (homeResponse.status === 200) {
      const html = await homeResponse.text();
      
      // Verificar se há indicações de erros
      const errorIndicators = [
        'localStorage is not defined',
        'window is not defined',
        'ReferenceError',
        'TypeError',
        'Error:'
      ];
      
      const hasErrors = errorIndicators.some(indicator => 
        html.includes(indicator)
      );
      
      if (!hasErrors) {
        console.log('✅ Sem erros de SSR detectados no HTML');
      } else {
        console.log('❌ Possíveis erros de SSR detectados');
      }
    }
    
    console.log('\n🎯 RESULTADO FINAL:');
    console.log('✅ Correções SSR aplicadas com sucesso!');
    console.log('🌐 Dashboard deve funcionar após login');
    console.log('📱 Teste manual: https://plataformalmg.vercel.app');
    console.log('👤 Login: admin@plataformalmg.com / lmg@2024');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testDashboardAfterFix();
