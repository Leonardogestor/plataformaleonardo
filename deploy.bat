@echo off
REM Script de Deploy para Vercel (Windows)
REM Uso: deploy.bat [staging|production]

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=staging

echo 🚀 Iniciando deploy para %ENVIRONMENT%...

REM Verificar se está logado na Vercel
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Você não está logado na Vercel. Execute 'vercel login' primeiro.
    exit /b 1
)

REM Verificar se .env.local existe
if not exist ".env.local" (
    echo ❌ Arquivo .env.local não encontrado. Configure as variáveis de ambiente locais.
    exit /b 1
)

REM Build do projeto
echo 📦 Buildando o projeto...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build falhou. Verifique os erros acima.
    exit /b 1
)

REM Deploy para Vercel
echo 🌐 Fazendo deploy para %ENVIRONMENT%...
if "%ENVIRONMENT%"=="production" (
    vercel --prod
) else (
    vercel
)

echo ✅ Deploy concluído com sucesso!
echo 🔗 URL: https://plataformalmg.vercel.app
