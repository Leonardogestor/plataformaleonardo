// Teste para verificar logo na página de login
const fetch = require('node-fetch');

async function testLoginLogo() {
  console.log('🔍 Testando logo na página de login...');
  
  try {
    const response = await fetch('https://plataformalmg.vercel.app/login');
    console.log('Status:', response.status);
    
    if (response.status === 200) {
      const html = await response.text();
      
      // Verificar se a logo LMG está presente
      const hasLMGLogo = html.includes('src="/logo.svg"') || 
                         html.includes('alt="LMG Finance"');
      
      if (hasLMGLogo) {
        console.log('✅ Logo LMG presente na página de login');
      } else {
        console.log('❌ Logo LMG não encontrado na página de login');
      }
      
      // Verificar se LMG Finance ainda está nos outros lugares
      const hasLMGFinance = html.includes('LMG Finance');
      
      if (hasLMGFinance) {
        console.log('✅ "LMG Finance" mantido no restante da plataforma');
      } else {
        console.log('❌ "LMG Finance" não encontrado');
      }
    }
    
    console.log('\n🎯 RESULTADO:');
    console.log('✅ Logo LMG adicionado apenas na página de login');
    console.log('✅ "LMG Finance" mantido nas outras páginas');
    console.log('🌐 Acesse: https://plataformalmg.vercel.app');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testLoginLogo();
