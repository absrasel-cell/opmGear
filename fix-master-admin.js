const { PrismaClient } = require('@prisma/client');

async function fixMasterAdmin() {
  console.log('🔧 Fixing Master Admin Role for absrasel@gmail.com...\n');

  const prisma = new PrismaClient();

  try {
    // First, check current user status
    console.log('1. Checking current user status...');
    const currentUser = await prisma.user.findUnique({
      where: { email: 'absrasel@gmail.com' },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        accessRole: true, 
        customerRole: true,
        adminLevel: true,
        createdAt: true 
      }
    });

    if (!currentUser) {
      console.log('❌ User absrasel@gmail.com not found in database');
      return;
    }

    console.log('   Current user details:');
    console.log(`   ID: ${currentUser.id}`);
    console.log(`   Email: ${currentUser.email}`);
    console.log(`   Name: ${currentUser.name}`);
    console.log(`   Access Role: ${currentUser.accessRole}`);
    console.log(`   Customer Role: ${currentUser.customerRole}`);
    console.log(`   Admin Level: ${currentUser.adminLevel}`);
    console.log(`   Created: ${currentUser.createdAt}`);

    // Update to Master Admin
    console.log('\n2. Updating to Master Admin...');
    const updatedUser = await prisma.user.update({
      where: { email: 'absrasel@gmail.com' },
      data: {
        accessRole: 'MASTER_ADMIN',
        adminLevel: 'MASTER'
      },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        accessRole: true, 
        customerRole: true,
        adminLevel: true
      }
    });

    console.log('✅ Successfully updated user to Master Admin:');
    console.log(`   ID: ${updatedUser.id}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Access Role: ${updatedUser.accessRole}`);
    console.log(`   Admin Level: ${updatedUser.adminLevel}`);

    console.log('\n🎉 Master Admin role fix complete!');
    console.log('📋 Next Steps:');
    console.log('1. Refresh your browser page');
    console.log('2. You should now see the Master Admin Dashboard');
    console.log('3. If not, try logging out and logging back in');

  } catch (error) {
    console.error('❌ Error fixing master admin role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMasterAdmin().catch(console.error);