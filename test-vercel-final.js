const axios = require('axios');

async function testVercelFinal() {
  console.log('🔍 Teste final do login na Vercel');
  console.log('URL: https://plataformalmg.vercel.app');
  console.log('Credenciais: admin@plataformalmg.com / admin123');

  try {
    // 1. Teste simples de login
    console.log('\n1. Testando login...');
    const response = await axios.post('https://plataformalmg.vercel.app/api/auth/callback/credentials',
      new URLSearchParams({
        email: 'admin@plataformalmg.com',
        password: 'admin123',
        csrfToken: 'test',
        callbackUrl: 'https://plataformalmg.vercel.app/dashboard',
        json: 'true'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 Test Agent'
        },
        maxRedirects: 5,
        timeout: 10000
      }
    );

    console.log('✅ Login bem-sucedido!');
    console.log('Status:', response.status);
    console.log('URL final:', response.request?.res?.responseUrl);

  } catch (error) {
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      
      if (error.response.status === 302) {
        console.log('✅ Redirecionamento detectado!');
        console.log('Location:', error.response.headers.location);
      } else {
        console.log('❌ Erro na resposta');
        console.log('Data:', error.response.data);
      }
    } else {
      console.error('❌ Erro de conexão:', error.message);
    }
  }
}

testVercelFinal();
