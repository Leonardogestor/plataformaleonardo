# Manter o banco Neon ativo (evitar branch parado)

No plano **gratuito** do Neon, o branch **suspende após ~5 minutos** sem uso. A primeira conexão depois disso demora (cold start) e pode falhar para o usuário.

## O que já existe no projeto

- **Rota `/api/db-ping`**: faz um `SELECT 1` no banco. Qualquer chamada a essa URL “acorda” o branch e mantém atividade.

## Opção 1: Plano pago no Neon (recomendado para produção)

- **Launch**: dá para **desativar** o “scale to zero” → o branch fica sempre ativo.
- **Scale**: permite “always on” ou tempo de suspensão configurável.

No Console Neon: **Configurações** do projeto (ou **Billing**) → upgrade do plano → desative o scale to zero no branch de produção.

Assim o banco **não para** e os clientes não são afetados.

## Opção 2: Keep-alive no plano gratuito

Chamar a URL do **db-ping** a cada **5 minutos** para o branch não suspender:

1. **Serviço externo (grátis)**  
   Ex.: [cron-job.org](https://cron-job.org) ou [Uptime Robot](https://uptimerobot.com)  
   - Crie um job que faz **GET** em:  
     `https://SEU_DOMINIO.com/api/db-ping`  
   - Intervalo: **5 minutos**.

2. **Vercel Cron (só Pro)**  
   No plano **Pro** do Vercel você pode usar `vercel.json` com algo como `*/5 * * * *` para chamar `/api/db-ping` a cada 5 minutos. No plano Hobby o cron só pode rodar no máximo 1x por dia, então não resolve.

## Acordar o branch agora (manual)

No **Console Neon** → projeto **lgmfinanceira-db** → **Editor SQL** → rode qualquer query (ex.: `SELECT 1`) com o botão **▷ Correr**. O branch volta a ficar ativo em poucos segundos.
