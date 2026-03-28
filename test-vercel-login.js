// Teste completo da plataforma na Vercel
const fetch = require('node-fetch');

async function testVercelPlatform() {
  console.log('🔍 Teste completo da plataforma na Vercel');
  console.log('URL: https://plataformalmg.vercel.app');
  
  const cookieJar = {};
  
  // Helper para extrair cookies
  function extractCookies(response) {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      setCookie.split(',').forEach(cookie => {
        const [nameValue] = cookie.trim().split(';');
        const [name, value] = nameValue.split('=');
        if (name && value) {
          cookieJar[name] = value;
        }
      });
    }
  }
  
  // Helper para formatar cookies
  function getCookies() {
    return Object.entries(cookieJar)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
  
  try {
    // 1. Acessar página de login
    console.log('\n1. Acessando página de login...');
    const loginPageResponse = await fetch('https://plataformalmg.vercel.app/login', {
      redirect: 'manual'
    });
    console.log('Status:', loginPageResponse.status);
    extractCookies(loginPageResponse);
    
    // 2. Fazer login
    console.log('\n2. Fazendo login...');
    const loginResponse = await fetch('https://plataformalmg.vercel.app/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': getCookies()
      },
      body: 'email=test@plataformalmg.com&password=123456&redirect=false&csrfToken=test',
      redirect: 'manual'
    });
    
    console.log('Login Status:', loginResponse.status);
    console.log('Location:', loginResponse.headers.get('location'));
    extractCookies(loginResponse);
    
    // 3. Acessar dashboard
    console.log('\n3. Acessando dashboard...');
    const dashboardResponse = await fetch('https://plataformalmg.vercel.app/dashboard', {
      headers: {
        'Cookie': getCookies()
      },
      redirect: 'manual'
    });
    
    console.log('Dashboard Status:', dashboardResponse.status);
    console.log('Location:', dashboardResponse.headers.get('location'));
    
    if (dashboardResponse.status === 200) {
      console.log('\n✅ SUCESSO! Dashboard acessível!');
      console.log('🎉 Plataforma funcionando 100% na Vercel!');
    } else if (dashboardResponse.status === 307) {
      console.log('\n❌ Dashboard redirecionando para login');
      console.log('🔧 Verifique se as credenciais estão corretas');
    }
    
    // 4. Testar API
    console.log('\n4. Testando API de transações...');
    const apiResponse = await fetch('https://plataformalmg.vercel.app/api/transactions', {
      headers: {
        'Cookie': getCookies()
      }
    });
    
    console.log('API Status:', apiResponse.status);
    if (apiResponse.status === 200) {
      const apiData = await apiResponse.json();
      console.log('✅ API funcionando! Total de transações:', apiData.total || 0);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testVercelPlatform();
