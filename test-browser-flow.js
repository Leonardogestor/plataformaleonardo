// Teste simulando fluxo real do navegador
const fetch = require('node-fetch');

async function testBrowserFlow() {
  console.log('🔍 Testando fluxo completo como navegador real');
  
  try {
    // 1. Acessar página de login para obter CSRF token
    console.log('\n1. Obtendo página de login...');
    const loginPageResponse = await fetch('https://plataformalmg.vercel.app/login');
    console.log('Status:', loginPageResponse.status);
    
    if (loginPageResponse.status !== 200) {
      throw new Error('Página de login não acessível');
    }
    
    const html = await loginPageResponse.text();
    
    // Extrair CSRF token do HTML
    const csrfMatch = html.match(/name="csrfToken" content="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;
    
    if (!csrfToken) {
      console.log('⚠️ CSRF token não encontrado, tentando sem ele...');
    } else {
      console.log('✅ CSRF token encontrado:', csrfToken.substring(0, 20) + '...');
    }
    
    // 2. Fazer login via API do NextAuth
    console.log('\n2. Fazendo login...');
    const loginData = new URLSearchParams({
      email: 'test@plataformalmg.com',
      password: '123456',
      csrfToken: csrfToken || 'test',
      callbackUrl: 'https://plataformalmg.vercel.app/dashboard',
      json: 'true'
    });
    
    const authResponse = await fetch('https://plataformalmg.vercel.app/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': loginPageResponse.headers.get('set-cookie') || ''
      },
      body: loginData,
      redirect: 'manual'
    });
    
    console.log('Auth Status:', authResponse.status);
    console.log('Auth Location:', authResponse.headers.get('location'));
    
    // 3. Seguir redirecionamento se houver
    let finalUrl = 'https://plataformalmg.vercel.app/dashboard';
    if (authResponse.status === 302) {
      const location = authResponse.headers.get('location');
      if (location) {
        finalUrl = location;
      }
    }
    
    // 4. Acessar dashboard com cookies da sessão
    console.log('\n3. Acessando dashboard...');
    const dashboardResponse = await fetch(finalUrl, {
      headers: {
        'Cookie': authResponse.headers.get('set-cookie') || ''
      },
      redirect: 'manual'
    });
    
    console.log('Dashboard Status:', dashboardResponse.status);
    console.log('Dashboard Location:', dashboardResponse.headers.get('location'));
    
    if (dashboardResponse.status === 200) {
      console.log('\n🎉 SUCESSO! Dashboard acessível!');
      console.log('✅ Plataforma funcionando 100% na Vercel!');
      
      // Testar API
      const apiResponse = await fetch('https://plataformalmg.vercel.app/api/transactions', {
        headers: {
          'Cookie': authResponse.headers.get('set-cookie') || ''
        }
      });
      
      console.log('API Status:', apiResponse.status);
      if (apiResponse.status === 200) {
        const apiData = await apiResponse.json();
        console.log('✅ API funcionando! Transações:', apiData.total || 0);
      }
      
      return true;
    } else {
      console.log('\n❌ Dashboard não acessível');
      console.log('Status:', dashboardResponse.status);
      
      if (dashboardResponse.status === 307) {
        console.log('Redirecionado para:', dashboardResponse.headers.get('location'));
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

testBrowserFlow().then(success => {
  if (success) {
    console.log('\n🎯 RESULTADO FINAL: Plataforma 100% funcional na Vercel!');
    console.log('📱 URL: https://plataformalmg.vercel.app');
    console.log('👤 Usuário teste: test@plataformalmg.com / 123456');
  } else {
    console.log('\n❌ RESULTADO FINAL: Problemas encontrados na Vercel');
  }
});
