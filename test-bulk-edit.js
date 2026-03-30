// Teste para a API de edição em massa de categorias
// Este arquivo pode ser usado para testar a funcionalidade

async function testBulkEditCategory() {
  const testData = {
    transactionIds: ["test-id-1", "test-id-2"],
    category: "Alimentação",
    subcategory: "Restaurante"
  }

  try {
    const response = await fetch('/api/transactions/bulk-edit-category', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    })

    if (response.ok) {
      const result = await response.json()
      console.log('Sucesso:', result)
    } else {
      console.error('Erro:', await response.text())
    }
  } catch (error) {
    console.error('Erro de conexão:', error)
  }
}

// Exportar para uso no console do navegador
if (typeof window !== 'undefined') {
  window.testBulkEditCategory = testBulkEditCategory
}
