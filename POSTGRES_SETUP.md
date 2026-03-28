# LMG PLATAFORMA FINANCEIRA - PostgreSQL Setup

## Iniciar PostgreSQL no Windows

### Opção 1: Serviço Windows
```powershell
# Verificar se está instalado
Get-Service -Name "*postgres*"

# Iniciar serviço
Start-Service postgresql-x64-<version>
```

### Opção 2: Executável direto
```powershell
# Navegar até pasta do PostgreSQL (exemplo)
cd "C:\Program Files\PostgreSQL\16\bin"

# Iniciar servidor
.\pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start
```

### Opção 3: Docker (se instalado)
```powershell
docker run --name lmg-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=lmg_platform -p 5432:5432 -d postgres:16
```

## Após PostgreSQL rodando

```bash
# Aplicar migrations
npx prisma migrate dev

# Gerar client
npx prisma generate

# Popular banco (opcional)
npx prisma db seed
```

## Credenciais atuais
- Host: localhost:5432
- Database: lmg_platform
- User: postgres
- Password: postgres
