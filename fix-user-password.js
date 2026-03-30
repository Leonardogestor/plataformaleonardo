const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixUserPassword() {
  try {
    console.log('🔧 Resetando senha do usuário...');

    const user = await prisma.user.findUnique({
      where: { email: 'suportelmgconsultoria@gmail.com' }
    });

    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log('✅ Usuário encontrado:', user.email);

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash('LMG@2026', 12);
    
    // Atualizar senha
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('✅ Senha atualizada com sucesso!');
    console.log('Email: suportelmgconsultoria@gmail.com');
    console.log('Senha: LMG@2026');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserPassword();
