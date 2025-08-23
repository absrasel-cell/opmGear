import { 
  InitiateUploadReq, 
  InitiateUploadRes, 
  CommitUploadReq, 
  UpdateInstructionReq,
  OrderAssetDTO
} from '@/lib/validation/orderAssets';

class OrdersAPI {
  private baseUrl = '/api/orders';

  async initiateUpload(orderId: string, data: InitiateUploadReq): Promise<InitiateUploadRes> {
    const response = await fetch(`/api/order-assets-initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...data })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to initiate upload: ${errorText}`);
    }

    return response.json();
  }

  async commitUpload(orderId: string, data: CommitUploadReq): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${orderId}/assets/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to commit upload: ${errorText}`);
    }

    return response.json();
  }

  async getAssets(orderId: string): Promise<OrderAssetDTO[]> {
    console.log(`🔄 API: Requesting assets for order ${orderId}...`);
    
    const response = await fetch(`/api/order-assets?orderId=${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    });

    console.log(`📊 API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.error || response.statusText;
      } catch {
        errorDetails = await response.text() || response.statusText;
      }
      
      const errorMessage = `API Error (${response.status}): ${errorDetails}`;
      console.error(`❌ Asset fetch failed:`, errorMessage);
      throw new Error(errorMessage);
    }

    const assets = await response.json();
    console.log(`✅ API: Assets retrieved successfully`, { count: assets.length, orderId });
    return assets;
  }

  async deleteAsset(orderId: string, assetId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${orderId}/assets/${assetId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete asset: ${errorText}`);
    }

    return response.json();
  }

  async updateInstruction(orderId: string, data: UpdateInstructionReq): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/${orderId}/instruction`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update instruction: ${errorText}`);
    }

    return response.json();
  }

  async uploadFileToSupabase(signedUrl: string, file: File): Promise<void> {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }
  }
}

export const ordersAPI = new OrdersAPI();