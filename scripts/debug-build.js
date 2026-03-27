const { execSync } = require('child_process');

console.log('🔍 DEBUG BUILD VERCEL');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

try {
  console.log('🔧 Running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma generate successful');
  
  console.log('🔧 Running next build...');
  execSync('npx next build', { stdio: 'inherit' });
  console.log('✅ Next build successful');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
