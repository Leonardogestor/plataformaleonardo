const fetch = require('node-fetch');

async function createUser() {
  try {
    const response = await fetch('https://plataformalmg.vercel.app/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'suportelmgconsultoria@gmail.com',
        name: 'Cliente LMG Consultoria',
        password: 'Lmg@2026'
      })
    });

    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

createUser();
