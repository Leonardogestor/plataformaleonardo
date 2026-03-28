// Script para testar problemas do dashboard
const fetch = require('node-fetch');

async function testDashboard() {
  console.log('🔍 Testando acesso ao dashboard...');
  
  try {
    // Test 1: Acesso direto ao dashboard (deve redirecionar para login)
    console.log('\n1. Testando acesso direto ao dashboard...');
    const response1 = await fetch('http://localhost:3000/dashboard', {
      redirect: 'manual'
    });
    console.log('Status:', response1.status);
    console.log('Headers:', Object.fromEntries(response1.headers));
    
    // Test 2: Acesso à API de transações
    console.log('\n2. Testando API de transações...');
    const response2 = await fetch('http://localhost:3000/api/transactions');
    console.log('Status:', response2.status);
    const data2 = await response2.text();
    console.log('Response:', data2.substring(0, 200) + '...');
    
    // Test 3: Acesso à API de balance
    console.log('\n3. Testando API de balance...');
    const response3 = await fetch('http://localhost:3000/api/balance');
    console.log('Status:', response3.status);
    const data3 = await response3.text();
    console.log('Response:', data3.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testDashboard();
