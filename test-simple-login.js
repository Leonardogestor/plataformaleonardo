const axios = require('axios');

async function testSimpleLogin() {
  try {
    console.log('🔐 Teste simples de login...');

    // Teste direto da API de autenticação
    const response = await axios.post('http://localhost:3000/api/auth/signin', {
      email: 'suportelmgconsultoria@gmail.com',
      password: 'LMG@2026',
      csrfToken: 'test',
      callbackUrl: 'http://localhost:3000/dashboard'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    console.log('Data:', response.data);

  } catch (error) {
    console.error('Erro:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
}

testSimpleLogin();
