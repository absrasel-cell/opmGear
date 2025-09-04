// Test utility for invoice functionality
// This is a temporary file to test invoice API functionality

export async function testInvoiceApi() {
  try {
    console.log('Testing invoice API endpoints...');
    
    // Test user invoices endpoint
    const userInvoicesResponse = await fetch('/api/user/invoices', {
      credentials: 'include'
    });
    
    console.log('User Invoices API:', {
      status: userInvoicesResponse.status,
      statusText: userInvoicesResponse.statusText,
      ok: userInvoicesResponse.ok
    });
    
    if (userInvoicesResponse.ok) {
      const data = await userInvoicesResponse.json();
      console.log('User invoices data:', data);
      return data;
    } else {
      const error = await userInvoicesResponse.text();
      console.error('User invoices error:', error);
      return null;
    }
    
  } catch (error) {
    console.error('Invoice API test failed:', error);
    return null;
  }
}

// Test invoice download functionality
export async function testInvoiceDownload(invoiceId: string, invoiceNumber: string) {
  try {
    console.log(`Testing invoice download for ID: ${invoiceId}, Number: ${invoiceNumber}`);
    
    const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
      credentials: 'include',
    });
    
    console.log('Invoice PDF API:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('content-type')
    });
    
    return response.ok;
  } catch (error) {
    console.error('Invoice download test failed:', error);
    return false;
  }
}