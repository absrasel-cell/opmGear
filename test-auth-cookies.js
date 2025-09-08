// Test script to check authentication cookies
async function testAuthCookies() {
  try {
    console.log('🔍 Testing authentication and cookies...')
    
    // Test session endpoint (should work if user is logged in)
    const sessionResponse = await fetch('http://localhost:3001/api/auth/session')
    const sessionData = await sessionResponse.json()
    
    console.log('📊 Session API Response:')
    console.log('  Status:', sessionResponse.status)
    console.log('  User:', sessionData.user ? `${sessionData.user.email} (${sessionData.user.accessRole})` : 'Not logged in')
    
    if (sessionData.user) {
      console.log('  User ID:', sessionData.user.id)
      console.log('  Access Role:', sessionData.user.accessRole)
      console.log('  Customer Role:', sessionData.user.customerRole)
      
      // Test if this user should have admin access
      const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF', 'ADMIN'].includes(sessionData.user.accessRole)
      console.log('  Is Admin:', isAdmin)
      
      if (isAdmin) {
        console.log('✅ User should be able to create invoices')
        console.log('💡 The issue might be with cookie handling in the invoice API')
      } else {
        console.log('❌ User does not have admin privileges')
        console.log('💡 Need to login as admin user or update user role')
      }
    } else {
      console.log('❌ No user session found')
      console.log('💡 User needs to log in to the dashboard first')
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

testAuthCookies()