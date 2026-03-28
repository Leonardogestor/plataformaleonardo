// Teste com novo usuário
const fetch = require('node-fetch');

async function testNewUser() {
  console.log('🔍 Testando com novo usuário...');
  console.log('📧 Email: admin@plataformalmg.com');
  console.log('🔑 Senha: lmg@2024');
  
  try {
    // 1. Acessar página de login
    console.log('\n1. Acessando página de login...');
    const loginPageResponse = await fetch('https://plataformalmg.vercel.app/login');
    console.log('Status:', loginPageResponse.status);
    
    // 2. Tentar login direto (sem CSRF token)
    console.log('\n2. Fazendo login...');
    const loginData = new URLSearchParams({
      email: 'admin@plataformalmg.com',
      password: 'lmg@2024',
      callbackUrl: 'https://plataformalmg.vercel.app/dashboard',
      json: 'true'
    });
    
    const authResponse = await fetch('https://plataformalmg.vercel.app/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: loginData,
      redirect: 'manual'
    });
    
    console.log('Auth Status:', authResponse.status);
    console.log('Auth Location:', authResponse.headers.get('location'));
    
    // 3. Verificar se o login foi bem-sucedido
    const authData = await authResponse.json();
    console.log('Auth Response:', authData);
    
    if (authData.url) {
      console.log('\n3. Acessando URL de redirecionamento...');
      const redirectResponse = await fetch(authData.url, {
        redirect: 'manual'
      });
      
      console.log('Redirect Status:', redirectResponse.status);
      console.log('Redirect Location:', redirectResponse.headers.get('location'));
      
      // 4. Acessar dashboard
      console.log('\n4. Acessando dashboard...');
      const dashboardResponse = await fetch('https://plataformalmg.vercel.app/dashboard', {
        redirect: 'manual'
      });
      
      console.log('Dashboard Status:', dashboardResponse.status);
      console.log('Dashboard Location:', dashboardResponse.headers.get('location'));
      
      if (dashboardResponse.status === 200) {
        console.log('\n🎉 SUCESSO! Dashboard acessível!');
        return true;
      } else {
        console.log('\n❌ Dashboard ainda redirecionando...');
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  }
}

testNewUser().then(success => {
  if (success) {
    console.log('\n🎯 RESULTADO: Plataforma funcionando!');
    console.log('🌐 Acesse: https://plataformalmg.vercel.app');
    console.log('👤 Faça login com: admin@plataformalmg.com / lmg@2024');
  } else {
    console.log('\n❌ Ainda há problemas no login...');
  }
});
