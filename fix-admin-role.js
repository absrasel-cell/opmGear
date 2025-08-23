const { Client } = require('pg');

async function fixAdminRole() {
  console.log('🔧 Fixing Admin Role Issue...\n');

  try {
    const client = new Client({
      connectionString: 'postgresql://postgres.nowxzkdkaegjwfhhqoez:KKQYfgW3V2wvclzz@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    
    // First, let's see all users with this email
    console.log('1. Checking all users with absrasel@gmail.com...');
    const allUsers = await client.query(
      'SELECT id, email, name, role, "adminLevel", "createdAt" FROM "User" WHERE email = $1 ORDER BY "createdAt"',
      ['absrasel@gmail.com']
    );

    console.log(`Found ${allUsers.rows.length} users with this email:`);
    allUsers.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Admin Level: ${user.adminLevel}`);
      console.log(`      Created: ${user.createdAt}`);
      console.log('');
    });

    // Find the customer user (the one currently being used)
    const customerUser = allUsers.rows.find(user => user.role === 'CUSTOMER');
    
    if (customerUser) {
      console.log('2. Updating customer user to admin...');
      console.log(`   Updating user ID: ${customerUser.id}`);
      
      const updateResult = await client.query(
        'UPDATE "User" SET role = $1, "adminLevel" = $2 WHERE id = $3 RETURNING id, email, name, role, "adminLevel"',
        ['ADMIN', 'MASTER', customerUser.id]
      );

      if (updateResult.rows.length > 0) {
        const updatedUser = updateResult.rows[0];
        console.log('✅ Successfully updated user to admin:');
        console.log(`   ID: ${updatedUser.id}`);
        console.log(`   Email: ${updatedUser.email}`);
        console.log(`   Name: ${updatedUser.name}`);
        console.log(`   Role: ${updatedUser.role}`);
        console.log(`   Admin Level: ${updatedUser.adminLevel}`);
      } else {
        console.log('❌ Failed to update user');
      }
    } else {
      console.log('❌ No customer user found to update');
    }

    // Verify the update
    console.log('\n3. Verifying the update...');
    const verifyResult = await client.query(
      'SELECT id, email, name, role, "adminLevel" FROM "User" WHERE email = $1',
      ['absrasel@gmail.com']
    );

    console.log('Current users with absrasel@gmail.com:');
    verifyResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Admin Level: ${user.adminLevel}`);
    });

    await client.end();

    console.log('\n🎉 Admin role fix complete!');
    console.log('📋 Next Steps:');
    console.log('1. Refresh your browser page');
    console.log('2. You should now see the admin dashboard');
    console.log('3. If not, try logging out and logging back in');

  } catch (error) {
    console.error('❌ Error fixing admin role:', error.message);
  }
}

fixAdminRole().catch(console.error);
