// Verificar configuração de ambiente na Vercel
const axios = require('axios');

async function checkVercelEnv() {
  console.log('🔍 Verificando configuração da Vercel...');
  
  try {
    // 1. Verificar se a aplicação está online
    const response = await axios.get('https://plataformalmg.vercel.app/api/health', {
      timeout: 5000
    }).catch(() => null);
    
    if (response) {
      console.log('✅ Aplicação online');
    } else {
      console.log('❌ Aplicação offline ou API health não existe');
    }

    // 2. Verificar página de login
    const loginResponse = await axios.get('https://plataformalmg.vercel.app/login');
    console.log('✅ Página de login acessível');

    // 3. Verificar se NextAuth está configurado
    const authResponse = await axios.get('https://plataformalmg.vercel.app/api/auth/session');
    console.log('Status da sessão:', authResponse.status);
    
    if (authResponse.status === 200) {
      console.log('✅ NextAuth API funcionando');
      console.log('Sessão atual:', authResponse.data);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkVercelEnv();
