// Script para forçar atualização dos dados na plataforma
// Execute este script no console do navegador

async function forceUpdate() {
  console.log('🚀 Iniciando força bruta de atualização...')
  
  try {
    // 1. Diagnóstico inicial
    console.log('📊 1. Fazendo diagnóstico...')
    const diagResponse = await fetch('/api/admin/diagnose')
    const diagnosis = await diagResponse.json()
    console.log('Diagnóstico:', diagnosis)
    
    // 2. Corrigir valores se necessário
    if (diagnosis.data?.transactions?.suspicious > 0) {
      console.log('🔧 2. Corrigindo valores...')
      const fixResponse = await fetch('/api/admin/fix-transaction-values', { method: 'POST' })
      const fixResult = await fixResponse.json()
      console.log('Correção:', fixResult)
    }
    
    // 3. Atualizar cache
    console.log('🔄 3. Atualizando cache...')
    const refreshResponse = await fetch('/api/admin/refresh-cache', { method: 'POST' })
    const refreshResult = await refreshResponse.json()
    console.log('Cache atualizado:', refreshResult)
    
    // 4. Limpar localStorage e sessionStorage
    console.log('🧹 4. Limpando storage...')
    localStorage.clear()
    sessionStorage.clear()
    
    // 5. Limpar todos os cookies
    console.log('🍪 5. Limpando cookies...')
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^.+=/, "").replace(/;.*/, "") + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"; 
    });
    
    // 6. Forçar reload completo
    console.log('♻️ 6. Forçando reload completo...')
    setTimeout(() => {
      window.location.reload(true)
    }, 1000)
    
  } catch (error) {
    console.error('❌ Erro na força bruta:', error)
    alert('Erro: ' + error.message)
  }
}

// Executar imediatamente
forceUpdate()

// Também adicionar ao window para execução manual
window.forceUpdate = forceUpdate

console.log('💡 Script carregado! Execute forceUpdate() no console a qualquer momento.')
