const axios = require('axios');

async function testLoginComplete() {
  console.log('🔐 Testando login completo...');

  try {
    // 1. Testar acesso ao dashboard (deve redirecionar para login)
    console.log('\n1. Testando proteção do dashboard...');
    const dashboardResponse = await axios.get('http://localhost:3000/dashboard', {
      maxRedirects: 0,
      validateStatus: (status) => status < 400
    }).catch(err => err.response);

    console.log(`Status do dashboard: ${dashboardResponse.status}`);
    if (dashboardResponse.status === 307) {
      console.log('✅ Dashboard protegido - redirecionando para login');
    }

    // 2. Acessar página de login
    console.log('\n2. Acessando página de login...');
    const loginPageResponse = await axios.get('http://localhost:3000/login');
    console.log(`Status da página de login: ${loginPageResponse.status}`);

    // 3. Fazer login
    console.log('\n3. Fazendo login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/callback/credentials', 
      new URLSearchParams({
        email: 'suportelmgconsultoria@gmail.com',
        password: 'LMG@2026',
        csrfToken: 'test', // CSRF token simplificado para teste
        callbackUrl: 'http://localhost:3000/dashboard',
        json: 'true'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': ''
        },
        maxRedirects: 0
      }
    ).catch(err => err.response);

    console.log(`Status do login: ${loginResponse.status}`);
    
    if (loginResponse.status === 302 || loginResponse.status === 200) {
      console.log('✅ Login bem-sucedido!');
      
      // 4. Testar acesso ao dashboard com cookie de sessão
      if (loginResponse.headers['set-cookie']) {
        console.log('\n4. Testando acesso ao dashboard com sessão...');
        const cookie = loginResponse.headers['set-cookie'][0];
        
        const dashboardAuthResponse = await axios.get('http://localhost:3000/dashboard', {
          headers: {
            'Cookie': cookie
          },
          maxRedirects: 0
        }).catch(err => err.response);

        console.log(`Status do dashboard autenticado: ${dashboardAuthResponse.status}`);
        
        if (dashboardAuthResponse.status === 200) {
          console.log('✅ Dashboard acessível com login!');
        } else {
          console.log('❌ Dashboard ainda não acessível');
        }
      }
    } else {
      console.log('❌ Login falhou');
      console.log('Resposta:', loginResponse.data);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testLoginComplete();
