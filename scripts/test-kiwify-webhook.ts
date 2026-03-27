#!/usr/bin/env tsx

/**
 * Script para testar webhook Kiwify localmente
 * Execute: npm run test:webhook ou npx tsx scripts/test-kiwify-webhook.ts
 */

import axios from 'axios';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/kiwify';
const WEBHOOK_SECRET = process.env.KIWIFY_WEBHOOK_SECRET || '';

// Mock de eventos Kiwify para teste
const testEvents = {
  order_paid: {
    event: 'order_paid',
    id: 'order_test_12345',
    created_at: new Date().toISOString(),
    data: {
      order_id: 'order_12345',
      transaction_id: 'txn_test_67890',
      status: 'paid',
      amount: 99.90,
      currency: 'BRL',
      customer: {
        name: 'Cliente Teste',
        email: 'cliente@teste.com',
        document: '12345678900',
        phone: '11999999999'
      },
      product: {
        id: 'prod_premium_monthly',
        name: 'Plano Premium Mensal',
        type: 'subscription',
        recurring: {
          interval: 'monthly',
          interval_count: 1
        }
      },
      paid_at: new Date().toISOString()
    }
  },

  subscription_renewed: {
    event: 'subscription_renewed',
    id: 'renew_test_54321',
    created_at: new Date().toISOString(),
    data: {
      subscription_id: 'sub_abc123',
      status: 'active',
      amount: 99.90,
      currency: 'BRL',
      customer: {
        name: 'Cliente Teste',
        email: 'cliente@teste.com'
      },
      product: {
        id: 'prod_premium_monthly',
        name: 'Plano Premium Mensal',
        type: 'subscription',
        recurring: {
          interval: 'monthly',
          interval_count: 1
        }
      },
      paid_at: new Date().toISOString()
    }
  },

  subscription_canceled: {
    event: 'subscription_canceled',
    id: 'cancel_test_98765',
    created_at: new Date().toISOString(),
    data: {
      subscription_id: 'sub_abc123',
      status: 'canceled',
      customer: {
        name: 'Cliente Teste',
        email: 'cliente@teste.com'
      },
      product: {
        id: 'prod_premium_monthly',
        name: 'Plano Premium Mensal',
        type: 'subscription'
      }
    }
  }
};

async function sendWebhook(eventType: keyof typeof testEvents) {
  const payload = testEvents[eventType];
  
  console.log(`\n🧪 ENVIANDO WEBHOOK TESTE: ${eventType}`);
  console.log(`📡 URL: ${WEBHOOK_URL}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kiwify-Webhook-Test/1.0'
    };

    // Adicionar secret se existir
    if (WEBHOOK_SECRET) {
      headers['x-kiwify-secret'] = WEBHOOK_SECRET;
      console.log(`🔐 Secret configurado: ${WEBHOOK_SECRET.substring(0, 3)}***`);
    }

    const response = await axios.post(WEBHOOK_URL, payload, { headers });

    console.log(`✅ RESPOSTA WEBHOOK (${response.status}):`);
    console.log(JSON.stringify(response.data, null, 2));

    return { success: true, response: response.data };
  } catch (error: any) {
    console.error(`❌ ERRO WEBHOOK:`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }

    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 INICIANDO TESTES DE WEBHOOK KIWIFY');
  console.log('=====================================');

  // Testar cada evento
  const events = Object.keys(testEvents) as (keyof typeof testEvents)[];
  
  for (const eventType of events) {
    await sendWebhook(eventType);
    
    // Aguardar um pouco entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Testar idempotência (enviar mesmo evento novamente)
  console.log('\n🔄 TESTANDO IDEMPOTÊNCIA...');
  await sendWebhook('order_paid');

  console.log('\n🎉 TESTES CONCLUÍDOS!');
  console.log('\n📋 CHECKLIST:');
  console.log('✅ Webhook respondeu 200 sempre?');
  console.log('✅ Eventos foram processados?');
  console.log('✅ Idempotência funcionou?');
  console.log('✅ Logs apareceram no console?');
  console.log('\n🔍 VERIFIQUE NO BANCO:');
  console.log('- Usuário criado/atualizado?');
  console.log('- Subscription criada?');
  console.log('- Premium access ativado?');
}

// Executar testes
if (require.main === module) {
  runTests().catch(console.error);
}

export { sendWebhook, testEvents };
