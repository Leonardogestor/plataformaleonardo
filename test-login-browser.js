// Teste simulando navegador real
const axios = require('axios');

async function testLoginBrowser() {
  console.log('🔐 Testando login simulando navegador...');

  const axiosInstance = axios.create({
    withCredentials: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  try {
    // 1. Obter página de login (para pegar CSRF token)
    console.log('\n1. Obtendo página de login...');
    const loginPageResponse = await axiosInstance.get('http://localhost:3000/login');
    console.log(`Status: ${loginPageResponse.status}`);

    // Extrair CSRF token do HTML (simplificado)
    const html = loginPageResponse.data;
    const csrfMatch = html.match(/name="csrfToken" content="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : 'test-csrf';

    console.log(`CSRF Token: ${csrfToken.substring(0, 20)}...`);

    // 2. Fazer login
    console.log('\n2. Fazendo login...');
    const loginResponse = await axiosInstance.post('http://localhost:3000/api/auth/callback/credentials',
      new URLSearchParams({
        email: 'suportelmgconsultoria@gmail.com',
        password: 'LMG@2026',
        csrfToken: csrfToken,
        callbackUrl: 'http://localhost:3000/dashboard',
        json: 'true'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 5 // Seguir redirecionamentos
      }
    );

    console.log(`Status final: ${loginResponse.status}`);
    console.log(`URL final: ${loginResponse.request.res.responseUrl}`);

    if (loginResponse.status === 200 && loginResponse.request.res.responseUrl?.includes('/dashboard')) {
      console.log('✅ Login e redirecionamento bem-sucedidos!');
      
      // 3. Verificar conteúdo do dashboard
      if (loginResponse.data.includes('LMG Platform') || loginResponse.data.includes('dashboard')) {
        console.log('✅ Dashboard carregado com sucesso!');
      } else {
        console.log('⚠️ Dashboard carregado mas conteúdo incomum');
      }
    } else {
      console.log('❌ Redirecionamento falhou');
      console.log('URL final:', loginResponse.request.res.responseUrl);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('URL:', error.response.request?.res?.responseUrl);
    }
  }
}

testLoginBrowser();
