import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function fixAdminUser() {
  try {
    console.log('🔧 Verificando usuário admin@plataformalmg.com...')

    // Verificar se o usuário admin existe
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@plataformalmg.com' }
    })

    if (existingUser) {
      console.log('✅ Usuário admin@plataformalmg.com já existe')
      
      // Atualizar senha para garantir acesso
      const hashedPassword = await bcrypt.hash('admin123', 10)
      await prisma.user.update({
        where: { email: 'admin@plataformalmg.com' },
        data: { password: hashedPassword }
      })
      
      console.log('🔑 Senha do usuário admin atualizada para: admin123')
    } else {
      console.log('❌ Usuário admin não encontrado. Criando...')
      
      // Criar usuário admin
      const hashedPassword = await bcrypt.hash('admin123', 10)
      const newUser = await prisma.user.create({
        data: {
          name: 'Administrador LMG',
          email: 'admin@plataformalmg.com',
          password: hashedPassword,
          role: 'ADMIN'
        }
      })
      
      console.log('✅ Usuário admin criado com sucesso!')
      console.log(`📧 Email: ${newUser.email}`)
      console.log(`🔑 Senha: admin123`)
      console.log(`👤 Nome: ${newUser.name}`)
    }

    // Listar todos os usuários para debug
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    console.log('\n📋 Todos os usuários no banco:')
    allUsers.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - ${user.role} - ${user.createdAt}`)
    })

  } catch (error) {
    console.error('❌ Erro ao verificar/criar usuário admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAdminUser()
