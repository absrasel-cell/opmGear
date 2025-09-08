// Debug dashboard routing issue
async function debugDashboardRouting() {
  try {
    console.log('🔍 Debugging dashboard routing issue...')
    
    // Test the session API to see what user data is returned
    const sessionResponse = await fetch('http://localhost:3001/api/auth/session')
    const sessionData = await sessionResponse.json()
    
    console.log('\n📊 Session API Response:')
    console.log('  Status:', sessionResponse.status)
    console.log('  User object:', JSON.stringify(sessionData.user, null, 2))
    
    if (sessionData.user) {
      const user = sessionData.user
      console.log('\n🔍 User Properties:')
      console.log('  ID:', user.id)
      console.log('  Email:', user.email) 
      console.log('  Name:', user.name)
      console.log('  Access Role:', user.accessRole, '(type:', typeof user.accessRole, ')')
      console.log('  Customer Role:', user.customerRole)
      
      // Test the dashboard routing logic
      const isAdmin = ['SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'].includes(user.accessRole)
      console.log('\n🎯 Dashboard Routing Logic:')
      console.log('  accessRole value:', `"${user.accessRole}"`)
      console.log('  Expected admin roles:', ['SUPER_ADMIN', 'MASTER_ADMIN', 'STAFF'])
      console.log('  Is admin check result:', isAdmin)
      console.log('  Should redirect to:', isAdmin ? '/dashboard/admin' : '/dashboard/member')
      
      // Test if the role matches exactly
      const exactMatch = user.accessRole === 'MASTER_ADMIN'
      console.log('  Exact MASTER_ADMIN match:', exactMatch)
      
      if (!isAdmin) {
        console.log('\n❌ PROBLEM IDENTIFIED:')
        console.log('  User has MASTER_ADMIN role but routing logic says not admin')
        console.log('  Possible causes:')
        console.log('  1. accessRole field has unexpected value or type')
        console.log('  2. Case sensitivity issue')
        console.log('  3. Hidden characters in the role string')
        console.log('  4. Timing issue in AuthContext')
      } else {
        console.log('\n✅ Routing logic should work correctly')
        console.log('💡 Issue might be in AuthContext timing or state management')
      }
      
    } else {
      console.log('\n❌ No user found in session')
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message)
  }
}

debugDashboardRouting()