// Script para testar o login após correção do middleware
const fetch = require('node-fetch');

async function testLogin() {
  console.log('🔐 Testando login após correção do middleware...\n');

  // Teste 1: Acessar dashboard sem autenticação (deve redirecionar para login)
  try {
    const response = await fetch('http://localhost:3000/dashboard', {
      redirect: 'manual' // Não seguir redirecionamentos
    });
    
    console.log(`Status do acesso ao dashboard: ${response.status}`);
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      console.log(`✅ Redirecionado para: ${location}`);
      if (location === '/login') {
        console.log('✅ Middleware funcionando - redirecionando para login corretamente');
      }
    }
  } catch (error) {
    console.log('❌ Erro ao testar acesso ao dashboard:', error.message);
  }

  // Teste 2: Acessar página de login (deve funcionar)
  try {
    const response = await fetch('http://localhost:3000/login');
    console.log(`Status da página de login: ${response.status}`);
    if (response.status === 200) {
      console.log('✅ Página de login acessível');
    }
  } catch (error) {
    console.log('❌ Erro ao acessar página de login:', error.message);
  }

  // Teste 3: Tentativa de login com credenciais inválidas
  try {
    const response = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'teste@invalido.com',
        password: 'senhaerrada',
        csrfToken: 'test',
        redirect: 'false',
        json: 'true'
      })
    });

    const text = await response.text();
    console.log(`Resposta do login inválido: ${response.status}`);
    console.log(`Conteúdo: ${text.substring(0, 100)}...`);
  } catch (error) {
    console.log('❌ Erro ao testar login:', error.message);
  }

  console.log('\n📋 Resumo:');
  console.log('1. Middleware foi reativado');
  console.log('2. NEXTAUTH_URL configurado para localhost:3000');
  console.log('3. Verifique se o servidor está rodando em localhost:3000');
  console.log('4. Use .env.development para variáveis de ambiente locais');
}

testLogin();
