import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
 try {
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const complexity = searchParams.get('complexity');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  // Build where clause
  const where: any = {};
  
  if (status && status !== 'ALL') {
   where.status = status;
  }
  
  if (priority && priority !== 'ALL') {
   where.priority = priority;
  }
  
  if (complexity && complexity !== 'ALL') {
   where.complexity = complexity;
  }

  // Fetch quote orders
  const quoteOrders = await prisma.quoteOrder.findMany({
   where,
   orderBy: { lastActivityAt: 'desc' },
   take: limit,
   skip: offset,
   include: {
    User: {
     select: {
      id: true,
      email: true,
      name: true
     }
    },
    Order: {
     select: {
      id: true,
      status: true,
      customerTotal: true
     }
    },
    QuoteOrderFile: {
     select: {
      id: true,
      originalName: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      filePath: true,
      category: true,
      isLogo: true,
      description: true,
      uploadedAt: true
     }
    }
   }
  });

  // Transform data for frontend - using actual schema fields
  const transformedQuoteOrders = quoteOrders.map(quoteOrder => ({
   id: quoteOrder.id,
   sessionId: quoteOrder.sessionId,
   title: quoteOrder.title || 'Untitled Quote',
   status: quoteOrder.status,
   priority: quoteOrder.priority,
   complexity: quoteOrder.complexity,
   customerInfo: {
    email: quoteOrder.customerEmail || '',
    name: quoteOrder.customerName || '',
    phone: quoteOrder.customerPhone || '',
    company: quoteOrder.customerCompany || '',
    address: quoteOrder.customerAddress || null
   },
   productType: quoteOrder.productType || 'Custom Cap',
   quantities: quoteOrder.quantities || {},
   colors: quoteOrder.colors || {},
   logoRequirements: quoteOrder.logoRequirements || { logos: [] },
   customizationOptions: quoteOrder.customizationOptions || { accessories: [], moldCharges: 0, delivery: {} },
   extractedSpecs: quoteOrder.extractedSpecs || {},
   estimatedCosts: quoteOrder.estimatedCosts || { baseProductCost: 0, logosCost: 0, deliveryCost: 0, total: 0 },
   aiSummary: quoteOrder.aiSummary || '',
   additionalRequirements: quoteOrder.additionalRequirements || '',
   customerInstructions: quoteOrder.customerInstructions || '',
   internalNotes: quoteOrder.internalNotes || '',
   tags: quoteOrder.tags || [],
   followUpRequired: quoteOrder.followUpRequired,
   followUpDate: quoteOrder.followUpDate?.toISOString() || '',
   assignedTo: quoteOrder.User ? {
    id: quoteOrder.User.id,
    email: quoteOrder.User.email || '',
    name: quoteOrder.User.name || 'Unknown'
   } : null,
   convertedOrder: quoteOrder.Order ? {
    id: quoteOrder.Order.id,
    status: quoteOrder.Order.status,
    customerTotal: Number(quoteOrder.Order.customerTotal || 0)
   } : null,
   files: (quoteOrder.QuoteOrderFile || []).map(file => ({
    id: file.id,
    originalName: file.originalName,
    fileName: file.fileName,
    fileType: file.fileType,
    fileSize: file.fileSize,
    filePath: file.filePath,
    category: file.category,
    isLogo: file.isLogo,
    description: file.description,
    uploadedAt: file.uploadedAt.toISOString()
   })),
   createdAt: quoteOrder.createdAt.toISOString(),
   updatedAt: quoteOrder.updatedAt.toISOString(),
   lastActivityAt: quoteOrder.lastActivityAt.toISOString(),
   completedAt: quoteOrder.completedAt?.toISOString() || '',
   conversionDate: quoteOrder.conversionDate?.toISOString() || '',
   conversionValue: Number(quoteOrder.conversionValue || 0)
  }));

  return NextResponse.json({ 
   quoteOrders: transformedQuoteOrders,
   count: transformedQuoteOrders.length,
   success: true
  });

 } catch (error) {
  console.error('Error fetching quote orders:', error);
  return NextResponse.json(
   { error: 'Failed to fetch quote orders', success: false },
   { status: 500 }
  );
 }
}

export async function PATCH(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const quoteId = searchParams.get('id');
  
  if (!quoteId) {
   return NextResponse.json(
    { error: 'Quote ID is required' },
    { status: 400 }
   );
  }

  const updates = await request.json();

  // Update quote order
  const updatedQuoteOrder = await prisma.quoteOrder.update({
   where: { id: quoteId },
   data: {
    ...updates,
    lastActivityAt: new Date(),
    updatedAt: new Date()
   }
  });

  return NextResponse.json({
   success: true,
   quoteOrder: updatedQuoteOrder
  });

 } catch (error) {
  console.error('Error updating quote order:', error);
  return NextResponse.json(
   { error: 'Failed to update quote order' },
   { status: 500 }
  );
 }
}

// Export a CSV of all quote orders
export async function POST(request: NextRequest) {
 try {
  const quoteOrders = await prisma.quoteOrder.findMany({
   orderBy: { createdAt: 'desc' },
   include: {
    User: { select: { email: true, name: true } }
   }
  });

  const csvData = quoteOrders.map(q => ({
   'Quote ID': q.id,
   'Session ID': q.sessionId,
   'Title': q.title || '',
   'Status': q.status,
   'Priority': q.priority || '',
   'Complexity': q.complexity || '',
   'Customer Email': q.customerEmail || '',
   'Customer Name': q.customerName || '',
   'Product Type': q.productType || '',
   'AI Summary': q.aiSummary || '',
   'Created At': q.createdAt.toISOString(),
   'Last Activity': q.lastActivityAt?.toISOString() || q.updatedAt.toISOString()
  }));

  return NextResponse.json({
   success: true,
   data: csvData,
   filename: `quote-orders-${new Date().toISOString().split('T')[0]}.csv`
  });

 } catch (error) {
  console.error('Error exporting quote orders:', error);
  return NextResponse.json(
   { error: 'Failed to export quote orders' },
   { status: 500 }
  );
 }
}