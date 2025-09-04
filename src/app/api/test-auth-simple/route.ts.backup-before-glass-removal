import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('Simple auth test endpoint accessed');
    
    // Check for cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('sb-access-token')?.value;
    const refreshToken = cookieStore.get('sb-refresh-token')?.value;
    
    // Check for auth header
    const authHeader = request.headers.get('authorization');
    
    console.log('Auth check results:');
    console.log('- Access token exists:', !!accessToken);
    console.log('- Refresh token exists:', !!refreshToken);
    console.log('- Auth header exists:', !!authHeader);
    
    return NextResponse.json({
      success: true,
      message: 'Auth test completed',
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasAuthHeader: !!authHeader,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Simple auth test error:', error);
    return NextResponse.json({ 
      error: 'Auth test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
