const axios = require('axios');

async function testVercelLoginFixed() {
  console.log('🔍 Testando login na Vercel após correção...');
  
  const baseURL = 'https://plataformaleonardo.vercel.app';

  try {
    // 1. Acessar página de login
    console.log('\n1. Acessando página de login...');
    const loginPage = await axios.get(`${baseURL}/login`);
    console.log(`Status: ${loginPage.status}`);

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
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 0
      }
    ).catch(err => err.response);

    console.log(`Login Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 302) {
      console.log('✅ Login redirecionando!');
      console.log('Location:', loginResponse.headers.location);
    }

    // 3. Acessar dashboard
    console.log('\n3. Acessando dashboard...');
    const dashboardResponse = await axios.get(`${baseURL}/dashboard`, {
      maxRedirects: 0
    }).catch(err => err.response);

    console.log(`Dashboard Status: ${dashboardResponse.status}`);
    
    if (dashboardResponse.status === 200) {
      console.log('✅ Dashboard acessível!');
    } else if (dashboardResponse.status === 307) {
      console.log('❌ Dashboard redirecionando para login');
      console.log('Location:', dashboardResponse.headers.location);
    }

    // 4. Testar API
    console.log('\n4. Testando API de transações...');
    const apiResponse = await axios.get(`${baseURL}/api/transactions`, {
      maxRedirects: 0
    }).catch(err => err.response);

    console.log(`API Status: ${apiResponse.status}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testVercelLoginFixed();
