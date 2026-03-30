// Script para criar usuário admin na produção
const fetch = require('node-fetch');

async function createProductionUser() {
  console.log('🔧 Criando usuário admin na produção...');
  
  const userData = {
    email: 'admin@plataformalmg.com',
    password: 'admin123',
    name: 'Administrador LMG'
  };

  try {
    const response = await fetch('https://plataformalmg.vercel.app/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Usuário criado com sucesso na produção!');
      console.log('📧 Email:', userData.email);
      console.log('🔑 Senha:', userData.password);
      console.log('📋 Resposta:', result);
    } else {
      console.log('❌ Erro ao criar usuário:', result);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

createProductionUser();
