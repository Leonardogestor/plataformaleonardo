const axios = require('axios');

async function testCompleteVercelLogin() {
  console.log('🔍 Teste completo de login na Vercel');
  console.log('URL: https://plataformalmg.vercel.app');
  
  const baseURL = 'https://plataformalmg.vercel.app';

  try {
    // 1. Obter página de login para CSRF
    console.log('\n1. Obtendo página de login...');
    const loginPage = await axios.get(`${baseURL}/login`);
    console.log('✅ Página de login carregada');

    // 2. Fazer login
    console.log('\n2. Fazendo login...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/callback/credentials`,
      new URLSearchParams({
        email: 'admin@plataformalmg.com',
        password: 'admin123',
        csrfToken: 'test',
        callbackUrl: `${baseURL}/dashboard`,
        json: 'true'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 0
      }
    ).catch(err => err.response);

    console.log(`Status do login: ${loginResponse.status}`);
    
    if (loginResponse.status === 302) {
      console.log('✅ Login redirecionando!');
      console.log('Location:', loginResponse.headers.location);
      
      // 3. Seguir redirecionamento
      if (loginResponse.headers.location?.includes('/dashboard')) {
        console.log('✅ Redirecionando para dashboard!');
        
        const dashboardResponse = await axios.get(`${baseURL}/dashboard`, {
          maxRedirects: 0
        }).catch(err => err.response);
        
        console.log(`Status do dashboard: ${dashboardResponse.status}`);
        
        if (dashboardResponse.status === 200) {
          console.log('✅ Dashboard acessível - Login funcionando!');
        } else {
          console.log('❌ Dashboard ainda redirecionando');
        }
      }
    } else {
      console.log('❌ Login não redirecionou');
      console.log('Resposta:', loginResponse.data?.substring(0, 200));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testCompleteVercelLogin();
