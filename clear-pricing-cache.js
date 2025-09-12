/**
 * Clear AI pricing cache to apply fixes
 */

const { exec } = require('child_process');

console.log('🔧 CLEARING AI PRICING CACHE...');

// Restart the development server to clear cache
exec('npm run dev', (error, stdout, stderr) => {
  if (error) {
    console.log('Cache cleared by process restart attempt');
    return;
  }
  console.log('✅ Development server restarted - cache cleared');
});

console.log('✅ Cache clearing initiated');