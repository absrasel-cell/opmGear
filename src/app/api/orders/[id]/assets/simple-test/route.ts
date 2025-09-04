import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } }
) {
 try {
  const { id: orderId } = params;
  
  // Simple test without authentication or Supabase
  const assets = await prisma.orderAsset.findMany({
   where: { orderId },
   take: 10
  });

  return NextResponse.json({
   success: true,
   orderId: orderId,
   assetCount: assets.length,
   assets: assets
  });

 } catch (error) {
  return NextResponse.json({
   success: false,
   error: error.message,
   stack: error.stack
  }, { status: 500 });
 }
}