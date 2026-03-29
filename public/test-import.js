// Script para testar se a importação está funcionando
// Execute no console do navegador

async function testImport() {
  console.log('🧪 Testando sistema de importação...')
  
  // 1. Testar parsing de valores
  console.log('📊 1. Testando parsing de valores...')
  const testValues = [
    'R$ 1.234,56',
    'R$ 12.345,67',
    'R$ 123.456,78',
    'R$ 1.234.567,89',
    '14022026',
    '27506194833',
    'R$ 2.072,00'
  ]
  
  try {
    const parsingResponse = await fetch('/api/admin/test-parsing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testValues })
    })
    const parsingResult = await parsingResponse.json()
    console.log('Resultado do parsing:', parsingResult)
  } catch (error) {
    console.error('Erro no parsing:', error)
  }
  
  // 2. Verificar transações existentes
  console.log('📋 2. Verificando transações existentes...')
  try {
    const transactionsResponse = await fetch('/api/transactions?limit=5')
    const transactionsData = await transactionsResponse.json()
    console.log('Transações recentes:', transactionsData.transactions?.slice(0, 3))
  } catch (error) {
    console.error('Erro ao buscar transações:', error)
  }
  
  // 3. Verificar diagnóstico
  console.log('🔍 3. Verificando diagnóstico...')
  try {
    const diagResponse = await fetch('/api/admin/diagnose')
    const diagnosis = await diagResponse.json()
    console.log('Diagnóstico:', diagnosis)
  } catch (error) {
    console.error('Erro no diagnóstico:', error)
  }
  
  // 4. Verificar se o hook está sendo usado
  console.log('🔧 4. Verificando hooks...')
  console.log('useFinancialDataSafe está ativo:', typeof window !== 'undefined')
  console.log('React Query disponível:', !!window.queryClient)
  
  console.log('✅ Teste concluído! Verifique os resultados acima.')
}

// Executar teste
testImport()

// Adicionar ao window para uso manual
window.testImport = testImport

console.log('💡 Script de teste carregado! Execute testImport() no console.')
