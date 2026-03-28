const fetch = require('node-fetch');

async function testLogin() {
  try {
    // Primeiro, pegar a página de login para obter o CSRF token
    const loginPage = await fetch('https://plataformalmg.vercel.app/login');
    const pageContent = await loginPage.text();
    
    // Extrair CSRF token da página (se existir)
    const csrfMatch = pageContent.match(/name="csrfToken" content="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : 'test';
    
    console.log('CSRF Token:', csrfToken);
    
    // Tentar fazer login
    const response = await fetch('https://plataformalmg.vercel.app/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `next-auth.csrf-token=${csrfToken};next-auth.callback-url=${encodeURIComponent('https://plataformalmg.vercel.app/dashboard')}`
      },
      body: new URLSearchParams({
        email: 'suportelmgconsultoria@gmail.com',
        password: 'Lmg@2026',
        csrfToken: csrfToken,
        redirect: 'false',
        json: 'true'
      })
    });

    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Headers:', response.headers.raw());
    console.log('Response:', result);
    
    // Se tiver cookies de sessão, o login funcionou
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('Cookies de sessão recebidos:', setCookieHeader);
      console.log('✅ LOGIN FUNCIONOU!');
    } else {
      console.log('❌ Nenhum cookie de sessão recebido');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();
