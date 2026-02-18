# Obter DATABASE_URL pelo terminal (Neon CLI)

Quando o console do Neon está com erro, use o **Neon CLI** no terminal.

## 1. Instalar o Neon CLI (uma vez)

```powershell
npm i -g neonctl
```

Ou use sem instalar (mais lento):

```powershell
npx neonctl <comando>
```

## 2. Autenticar

```powershell
npx neonctl auth
```

- Pode abrir o navegador para você logar no Neon (às vezes funciona mesmo com o console dando erro).
- Ou use **API Key**: crie em https://console.neon.tech (quando estiver no ar) em **Account Settings > API Keys** e depois:

```powershell
$env:NEON_API_KEY="sua-api-key-aqui"
npx neonctl connection-string --prisma
```

## 3. Definir projeto e branch (se tiver mais de um)

Listar projetos:

```powershell
npx neonctl projects list
```

Definir contexto (use o ID do projeto e do branch que aparecem na URL do console):

Listar organizações e definir a que tem o projeto:
```powershell
npx neonctl orgs list
npx neonctl set-context --org-id org-winter-truth-09428671
```
(Use o **Id** real da lista, sem &lt; e &gt; — no PowerShell, &lt; &gt; são operadores e geram erro.)

Listar projetos da org atual (para copiar o Id exato do lgmfinanceira-db):
```powershell
npx neonctl projects list
```
Use o **Id** da coluna "Id" do projeto **lgmfinanceira-db** (às vezes o formato difere do que aparece na URL). Depois:
```powershell
npx neonctl connection-string --prisma --project-id COLE_O_ID_DA_TABELA
```

## 4. Pegar a connection string no formato Prisma

Se você tem **mais de um projeto**, informe o ID (veja a lista com `npx neonctl projects list`):

```powershell
npx neonctl connection-string --prisma --project-id SEU_PROJECT_ID
```

Exemplos com os IDs da sua lista:
- **lgmfinanceira-db** (região sa-east-1) — projeto usado por este app: `--project-id old-truth-40892037` (Id exato da tabela `projects list`)
- **Plataforma Gestão Financeira LMG**: `--project-id dry-base-2747423209Z`
- **assessor-leo-backend**: `--project-id restless-haze-2914474833Z`

Se tiver só um projeto:
```powershell
npx neonctl connection-string --prisma
```

A saída será uma URL que começa com `postgresql://...`

## 5. Colocar no .env

1. Abra o arquivo `.env` na raiz do projeto (`c:\plataformaleo\.env`).
2. Atualize a linha `DATABASE_URL` com a URL que o comando acima mostrou:

```
DATABASE_URL="postgresql://..."
```

3. Salve o arquivo.

## 6. Aplicar a migração

```powershell
cd c:\plataformaleo
npx prisma migrate deploy
```

Pronto. A coluna `conditionJson` e as demais migrações pendentes serão aplicadas.
