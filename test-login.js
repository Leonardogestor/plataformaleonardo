const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('https://plataformalmg.vercel.app/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'suportelmgconsultoria@gmail.com',
        password: 'Lmg@2026',
        csrfToken: 'test',
        redirect: 'false',
        json: 'true'
      })
    });

    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
