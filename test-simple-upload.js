// Teste simples para verificar se o endpoint de upload está funcionando
const fs = require('fs');
const path = require('path');

// Criar um PDF de teste simples
const createTestFile = () => {
  const testContent = `
BANCO NUBANK
Extrato de Conta Corrente
Período: 01/01/2026 a 31/01/2026

Data      Descrição            Valor
15/01/26  Salário              5.000,00
16/01/26  Supermercado ABC     -350,75
17/01/26  Aluguel Apartamento -1.200,00
18/01/26  Uber Viagem          -45,50
19/01/26  Investimento CDB     1.000,00
`;

  // Salvar como arquivo de texto para simular PDF
  const filePath = path.join(__dirname, 'test-extract.txt');
  fs.writeFileSync(filePath, testContent, 'utf8');
  console.log('Arquivo de teste criado:', filePath);
  return filePath;
};

// Testar se o servidor está respondendo
const testServerHealth = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    const result = await response.json();
    console.log('✅ Servidor saudável:', result);
    return true;
  } catch (error) {
    console.error('❌ Servidor não está respondendo:', error.message);
    return false;
  }
};

// Testar se o endpoint de documents existe (sem autenticação)
const testDocumentsEndpoint = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/documents');
    console.log('Status do endpoint /api/documents:', response.status);
    
    if (response.status === 401) {
      console.log('✅ Endpoint existe e exige autenticação (como esperado)');
      return true;
    } else {
      const text = await response.text();
      console.log('Resposta inesperada:', text);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao acessar endpoint:', error.message);
    return false;
  }
};

// Executar testes
const runTests = async () => {
  console.log('=== Testes Simples de Upload ===\n');
  
  // 1. Verificar saúde do servidor
  console.log('1. Verificando saúde do servidor...');
  const isHealthy = await testServerHealth();
  
  if (!isHealthy) {
    console.log('\n❌ Servidor não está saudável. Abortando testes.');
    return;
  }
  
  // 2. Verificar endpoint
  console.log('\n2. Verificando endpoint de documents...');
  const endpointExists = await testDocumentsEndpoint();
  
  if (!endpointExists) {
    console.log('\n❌ Endpoint não está funcionando como esperado.');
    return;
  }
  
  // 3. Criar arquivo de teste
  console.log('\n3. Criando arquivo de teste...');
  const filePath = createTestFile();
  
  console.log('\n✅ Testes básicos concluídos com sucesso!');
  console.log('   - Servidor está online');
  console.log('   - Endpoint de upload existe e exige autenticação');
  console.log('   - Arquivo de teste criado');
  
  console.log('\n📝 Para testar o upload completo:');
  console.log('   1. Faça login em http://localhost:3001/login');
  console.log('   2. Use as credenciais: test@example.com / 123456');
  console.log('   3. Navegue para http://localhost:3001/imports');
  console.log('   4. Tente fazer upload do arquivo:', filePath);
  
  // Limpar arquivo de teste
  setTimeout(() => {
    fs.unlinkSync(filePath);
    console.log('\nArquivo de teste removido.');
  }, 5000);
};

runTests().catch(console.error);
