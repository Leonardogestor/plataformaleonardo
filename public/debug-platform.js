// Script completo de diagnóstico da plataforma
// Execute no console do navegador

async function debugPlatform() {
  console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO DA PLATAFORMA...')
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    issues: [],
    solutions: []
  }

  // 1. Testar conexão com APIs
  console.log('🌐 1. Testando conexão com APIs...')
  
  const apiTests = [
    { name: 'Transactions', url: '/api/transactions?limit=5' },
    { name: 'Debug Transactions', url: '/api/admin/debug-transactions' },
    { name: 'Diagnosis', url: '/api/admin/diagnose' },
    { name: 'Balance', url: '/api/balance' },
    { name: 'Investments', url: '/api/investments' }
  ]
  
  for (const test of apiTests) {
    try {
      const response = await fetch(test.url)
      const data = await response.json()
      
      results.tests.push({
        name: test.name,
        status: response.ok ? '✅ OK' : '❌ ERROR',
        status_code: response.status,
        data_keys: Object.keys(data || {}),
        has_data: !!data && (data.transactions?.length > 0 || data.data || data.length > 0)
      })
      
      console.log(`${response.ok ? '✅' : '❌'} ${test.name}: ${response.status}`)
      
      if (!response.ok) {
        results.issues.push(`API ${test.name} retornou erro ${response.status}`)
      }
    } catch (error) {
      results.tests.push({
        name: test.name,
        status: '❌ FAILED',
        error: error.message
      })
      results.issues.push(`API ${test.name} falhou: ${error.message}`)
      console.log(`❌ ${test.name}: ${error.message}`)
    }
  }

  // 2. Verificar hooks e React Query
  console.log('🔧 2. Verificando hooks e React Query...')
  
  const hookTests = {
    'useFinancialDataSafe': typeof window !== 'undefined',
    'React Query': !!window.queryClient,
    'TanStack Query': !!window.ReactQueryClient,
    'LocalStorage': typeof localStorage !== 'undefined',
    'SessionStorage': typeof sessionStorage !== 'undefined'
  }
  
  Object.entries(hookTests).forEach(([hook, exists]) => {
    results.tests.push({
      name: `Hook: ${hook}`,
      status: exists ? '✅ AVAILABLE' : '❌ MISSING'
    })
    console.log(`${exists ? '✅' : '❌'} ${hook}: ${exists ? 'Available' : 'Missing'}`)
    
    if (!exists) {
      results.issues.push(`Hook ${hook} não está disponível`)
    }
  })

  // 3. Verificar storage
  console.log('💾 3. Verificando storage...')
  
  try {
    const localStorageKeys = Object.keys(localStorage)
    const sessionStorageKeys = Object.keys(sessionStorage)
    
    results.tests.push({
      name: 'LocalStorage Items',
      status: localStorageKeys.length > 0 ? '✅ HAS_DATA' : '⚠️ EMPTY',
      count: localStorageKeys.length
    })
    
    results.tests.push({
      name: 'SessionStorage Items', 
      status: sessionStorageKeys.length > 0 ? '✅ HAS_DATA' : '⚠️ EMPTY',
      count: sessionStorageKeys.length
    })
    
    console.log(`💾 LocalStorage: ${localStorageKeys.length} itens`)
    console.log(`💾 SessionStorage: ${sessionStorageKeys.length} itens`)
    
  } catch (error) {
    results.issues.push(`Erro ao verificar storage: ${error.message}`)
  }

  // 4. Verificar se há dados reais
  console.log('📊 4. Verificando dados reais...')
  
  try {
    const debugResponse = await fetch('/api/admin/debug-transactions')
    const debugData = await debugResponse.json()
    
    if (debugResponse.ok) {
      results.tests.push({
        name: 'Real Data Check',
        status: debugData.checks.directTransactionsCount > 0 ? '✅ HAS_DATA' : '❌ EMPTY',
        transactions: debugData.checks.directTransactionsCount,
        accounts: debugData.checks.accountsCount,
        income: debugData.checks.totalIncome,
        expenses: debugData.checks.totalExpenses
      })
      
      console.log(`📊 Transações: ${debugData.checks.directTransactionsCount}`)
      console.log(`💰 Contas: ${debugData.checks.accountsCount}`)
      console.log(`💵 Receitas: R$ ${debugData.checks.totalIncome}`)
      console.log(`💸 Despesas: R$ ${debugData.checks.totalExpenses}`)
      
      if (debugData.checks.directTransactionsCount > 0) {
        results.solutions.push('✅ Dados existem no banco - problema está no frontend')
      } else {
        results.solutions.push('❌ Nenhum dado no banco - precisa importar transações')
      }
    }
  } catch (error) {
    results.issues.push(`Erro ao verificar dados reais: ${error.message}`)
  }

  // 5. Gerar soluções
  console.log('🎯 5. Gerando soluções...')
  
  if (results.issues.length === 0) {
    results.solutions.push('✅ Tudo funcionando corretamente!')
  } else {
    if (results.issues.some(issue => issue.includes('API'))) {
      results.solutions.push('🔧 Verifique se as APIs estão funcionando')
      results.solutions.push('🔧 Verifique se o usuário está autenticado')
    }
    
    if (results.issues.some(issue => issue.includes('Hook'))) {
      results.solutions.push('🔧 Verifique se os hooks estão sendo importados')
      results.solutions.push('🔧 Recarregue a página (Ctrl+F5)')
    }
    
    if (results.issues.some(issue => issue.includes('EMPTY'))) {
      results.solutions.push('📥 Importe transações via CSV/Excel')
      results.solutions.push('📝 Cadastre transações manualmente')
    }
  }

  // 6. Exibir resultados
  console.log('\n📋 RELATÓRIO COMPLETO:')
  console.log('='.repeat(50))
  
  results.tests.forEach(test => {
    console.log(`${test.status} ${test.name}`)
    if (test.error) console.log(`   Erro: ${test.error}`)
    if (test.data_keys) console.log(`   Keys: ${test.data_keys.join(', ')}`)
  })
  
  if (results.issues.length > 0) {
    console.log('\n❌ PROBLEMAS ENCONTRADOS:')
    results.issues.forEach(issue => console.log(`   • ${issue}`))
  }
  
  console.log('\n🎯 SOLUÇÕES:')
  results.solutions.forEach(solution => console.log(`   • ${solution}`))
  
  console.log('\n✅ Diagnóstico concluído!')
  
  return results
}

// Executar diagnóstico imediatamente
debugPlatform()

// Adicionar ao window para uso manual
window.debugPlatform = debugPlatform

console.log('💡 Script de diagnóstico carregado! Execute debugPlatform() a qualquer momento.')
