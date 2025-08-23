const { Client } = require('pg');

async function fixUserIdMismatch() {
  console.log('🔧 Fixing User ID Mismatch...\n');

  try {
    const client = new Client({
      connectionString: 'postgresql://postgres.nowxzkdkaegjwfhhqoez:KKQYfgW3V2wvclzz@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    
    // Current session user ID (from your logs)
    const sessionUserId = '34040f7b-1686-41c6-bf44-a1257d738d98';
    const adminUserId = '4900b3bc-2064-4d5d-946f-2b31c58c8e5a';
    
    console.log('1. Current situation:');
    console.log(`   Session User ID: ${sessionUserId}`);
    console.log(`   Admin User ID: ${adminUserId}`);
    console.log('   These IDs don\'t match, causing the role issue\n');

    // Check if session user ID exists
    console.log('2. Checking if session user ID exists in database...');
    const sessionUser = await client.query(
      'SELECT id, email, name, role, "adminLevel" FROM "User" WHERE id = $1',
      [sessionUserId]
    );

    if (sessionUser.rows.length > 0) {
      console.log('✅ Session user ID exists in database:');
      const user = sessionUser.rows[0];
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Admin Level: ${user.adminLevel}`);
    } else {
      console.log('❌ Session user ID does not exist in database');
    }

    // Check admin user
    console.log('\n3. Checking admin user...');
    const adminUser = await client.query(
      'SELECT id, email, name, role, "adminLevel" FROM "User" WHERE id = $1',
      [adminUserId]
    );

    if (adminUser.rows.length > 0) {
      console.log('✅ Admin user exists in database:');
      const user = adminUser.rows[0];
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Admin Level: ${user.adminLevel}`);
    } else {
      console.log('❌ Admin user does not exist in database');
    }

    // Solution: Update the admin user's ID to match the session ID
    console.log('\n4. Fixing the issue...');
    console.log('   Updating admin user ID to match session ID...');
    
    const updateResult = await client.query(
      'UPDATE "User" SET id = $1, "updatedAt" = NOW() WHERE email = $2 RETURNING id, email, name, role, "adminLevel"',
      [sessionUserId, 'absrasel@gmail.com']
    );

    if (updateResult.rows.length > 0) {
      const updatedUser = updateResult.rows[0];
      console.log('✅ Successfully updated admin user ID:');
      console.log(`   New ID: ${updatedUser.id}`);
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Name: ${updatedUser.name}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   Admin Level: ${updatedUser.adminLevel}`);
    } else {
      console.log('❌ Failed to update user - email not found');
    }

    await client.end();

    console.log('\n🎉 User ID mismatch fix complete!');
    console.log('📋 Next Steps:');
    console.log('1. Refresh your browser page');
    console.log('2. You should now see the admin dashboard');
    console.log('3. If not, try logging out and logging back in');

  } catch (error) {
    console.error('❌ Error fixing user ID mismatch:', error.message);
  }
}

fixUserIdMismatch().catch(console.error);
