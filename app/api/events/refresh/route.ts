import { NextRequest } from "next/server"

// Server-Sent Events para notificar cliente em tempo real
export async function GET(request: NextRequest) {
  // Configurar headers para Server-Sent Events
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  })

  // Criar readable stream para enviar eventos
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      // Enviar evento inicial
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      // Manter conexão aberta e enviar heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`))
        } catch (error) {
          clearInterval(heartbeat)
        }
      }, 30000) // 30 segundos

      // Limpar quando a conexão fechar
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        controller.close()
      })
    }
  })

  return new Response(stream, { headers })
}

// Endpoint para disparar evento de atualização
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data, userId } = body

    // Aqui você poderia implementar um sistema de pub/sub real
    // Por enquanto, vamos apenas logar o evento
    console.log('📢 Evento de atualização disparado:', { type, data, userId })

    // Em um sistema real, você enviaria este evento para todos os clientes conectados
    // via WebSocket, Server-Sent Events, ou outro mecanismo

    return Response.json({ 
      success: true, 
      message: 'Evento de atualização disparado',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro ao disparar evento:', error)
    return Response.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
