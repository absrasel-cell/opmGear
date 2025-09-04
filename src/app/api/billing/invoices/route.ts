import { NextRequest, NextResponse } from 'next/server';

export interface InvoiceTemplate {
 id: string;
 name: string;
 paymentTerms: string; // "Net 30", "Due on receipt", etc.
 taxRate: number;
 defaultDiscountPercent: number;
 defaultDiscountFlat: number;
 createdAt: string;
 updatedAt: string;
 isActive: boolean;
}

export interface Invoice {
 id: string;
 templateId?: string;
 customerName: string;
 customerEmail: string;
 customerCompany?: string;
 orderIds: string[];
 subtotal: number;
 discountPercent: number;
 discountFlat: number;
 taxAmount: number;
 totalAmount: number;
 status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
 createdAt: string;
 updatedAt: string;
 dueDate?: string;
 paidAt?: string;
 notes?: string;
}

export interface DiscountRule {
 id: string;
 name: string;
 discountPercent: number;
 discountFlat: number;
 isGlobal: boolean;
 isActive: boolean;
 createdAt: string;
 updatedAt: string;
}

// Mock data - in production this would be stored in database
const invoiceTemplates: InvoiceTemplate[] = [
 {
  id: '1',
  name: 'Standard Net 30',
  paymentTerms: 'Net 30',
  taxRate: 0,
  defaultDiscountPercent: 5,
  defaultDiscountFlat: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true
 },
 {
  id: '2',
  name: 'Wholesale Express',
  paymentTerms: 'Due on receipt',
  taxRate: 0,
  defaultDiscountPercent: 0,
  defaultDiscountFlat: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true
 },
 {
  id: '3',
  name: 'Reseller Net 15',
  paymentTerms: 'Net 15',
  taxRate: 0,
  defaultDiscountPercent: 2.5,
  defaultDiscountFlat: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isActive: true
 }
];

const invoices: Invoice[] = [];

const discountRules: DiscountRule[] = [
 {
  id: '1',
  name: 'Global Discount Rule',
  discountPercent: 0,
  discountFlat: 0,
  isGlobal: true,
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
 }
];

export async function GET(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'invoices', 'templates', 'discount-rules'
  const status = searchParams.get('status');
  
  if (type === 'templates') {
   const activeTemplates = invoiceTemplates.filter(t => t.isActive);
   return NextResponse.json({
    success: true,
    data: activeTemplates
   });
  }
  
  if (type === 'discount-rules') {
   const activeRules = discountRules.filter(r => r.isActive);
   return NextResponse.json({
    success: true,
    data: activeRules
   });
  }
  
  // Default to invoices
  let filteredInvoices = invoices;
  
  if (status && status !== 'all') {
   filteredInvoices = filteredInvoices.filter(invoice => invoice.status === status);
  }
  
  return NextResponse.json({
   success: true,
   data: filteredInvoices,
   summary: {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length
   }
  });
 } catch (error) {
  console.error('Error fetching billing data:', error);
  return NextResponse.json(
   { success: false, error: 'Failed to fetch billing data' },
   { status: 500 }
  );
 }
}

export async function POST(request: NextRequest) {
 try {
  const body = await request.json();
  const { type } = body;
  
  if (type === 'invoice') {
   const {
    templateId,
    customerName,
    customerEmail,
    customerCompany,
    orderIds,
    subtotal,
    discountPercent = 0,
    discountFlat = 0,
    taxRate = 0,
    notes
   } = body;
   
   if (!customerName || !customerEmail || !orderIds || orderIds.length === 0) {
    return NextResponse.json(
     { success: false, error: 'Missing required invoice data' },
     { status: 400 }
    );
   }
   
   const taxAmount = subtotal * (taxRate / 100);
   const discountAmount = (subtotal * discountPercent / 100) + discountFlat;
   const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);
   
   const newInvoice: Invoice = {
    id: `INV-${Date.now()}`,
    templateId,
    customerName,
    customerEmail,
    customerCompany,
    orderIds,
    subtotal,
    discountPercent,
    discountFlat,
    taxAmount,
    totalAmount,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes
   };
   
   // Calculate due date based on template payment terms
   if (templateId) {
    const template = invoiceTemplates.find(t => t.id === templateId);
    if (template && template.paymentTerms.includes('Net')) {
     const days = parseInt(template.paymentTerms.replace('Net ', ''));
     const dueDate = new Date();
     dueDate.setDate(dueDate.getDate() + days);
     newInvoice.dueDate = dueDate.toISOString();
    }
   }
   
   invoices.push(newInvoice);
   
   return NextResponse.json({
    success: true,
    message: 'Invoice created successfully',
    data: newInvoice
   });
  }
  
  if (type === 'template') {
   const {
    name,
    paymentTerms,
    taxRate = 0,
    defaultDiscountPercent = 0,
    defaultDiscountFlat = 0
   } = body;
   
   if (!name || !paymentTerms) {
    return NextResponse.json(
     { success: false, error: 'Missing required template data' },
     { status: 400 }
    );
   }
   
   const newTemplate: InvoiceTemplate = {
    id: `TPL-${Date.now()}`,
    name,
    paymentTerms,
    taxRate,
    defaultDiscountPercent,
    defaultDiscountFlat,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true
   };
   
   invoiceTemplates.push(newTemplate);
   
   return NextResponse.json({
    success: true,
    message: 'Invoice template created successfully',
    data: newTemplate
   });
  }
  
  if (type === 'discount-rule') {
   const { name, discountPercent, discountFlat, isGlobal = true } = body;
   
   const newRule: DiscountRule = {
    id: `DR-${Date.now()}`,
    name: name || 'New Discount Rule',
    discountPercent: discountPercent || 0,
    discountFlat: discountFlat || 0,
    isGlobal,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
   };
   
   discountRules.push(newRule);
   
   return NextResponse.json({
    success: true,
    message: 'Discount rule created successfully',
    data: newRule
   });
  }
  
  return NextResponse.json(
   { success: false, error: 'Invalid request type' },
   { status: 400 }
  );
  
 } catch (error) {
  console.error('Error creating billing item:', error);
  return NextResponse.json(
   { success: false, error: 'Failed to create billing item' },
   { status: 500 }
  );
 }
}

export async function PUT(request: NextRequest) {
 try {
  const body = await request.json();
  const { type, id } = body;
  
  if (type === 'invoice') {
   const invoiceIndex = invoices.findIndex(inv => inv.id === id);
   
   if (invoiceIndex === -1) {
    return NextResponse.json(
     { success: false, error: 'Invoice not found' },
     { status: 404 }
    );
   }
   
   // Update invoice
   invoices[invoiceIndex] = {
    ...invoices[invoiceIndex],
    ...body,
    updatedAt: new Date().toISOString()
   };
   
   return NextResponse.json({
    success: true,
    message: 'Invoice updated successfully',
    data: invoices[invoiceIndex]
   });
  }
  
  if (type === 'template') {
   const templateIndex = invoiceTemplates.findIndex(tpl => tpl.id === id);
   
   if (templateIndex === -1) {
    return NextResponse.json(
     { success: false, error: 'Template not found' },
     { status: 404 }
    );
   }
   
   // Update template
   invoiceTemplates[templateIndex] = {
    ...invoiceTemplates[templateIndex],
    ...body,
    updatedAt: new Date().toISOString()
   };
   
   return NextResponse.json({
    success: true,
    message: 'Template updated successfully',
    data: invoiceTemplates[templateIndex]
   });
  }
  
  if (type === 'discount-rule') {
   const ruleIndex = discountRules.findIndex(rule => rule.id === id);
   
   if (ruleIndex === -1) {
    return NextResponse.json(
     { success: false, error: 'Discount rule not found' },
     { status: 404 }
    );
   }
   
   // Update the global discount rule
   discountRules[ruleIndex] = {
    ...discountRules[ruleIndex],
    discountPercent: body.discountPercent || 0,
    discountFlat: body.discountFlat || 0,
    updatedAt: new Date().toISOString()
   };
   
   return NextResponse.json({
    success: true,
    message: 'Discount rule updated successfully',
    data: discountRules[ruleIndex]
   });
  }
  
  return NextResponse.json(
   { success: false, error: 'Invalid request type' },
   { status: 400 }
  );
  
 } catch (error) {
  console.error('Error updating billing item:', error);
  return NextResponse.json(
   { success: false, error: 'Failed to update billing item' },
   { status: 500 }
  );
 }
}

export async function DELETE(request: NextRequest) {
 try {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  
  if (!type || !id) {
   return NextResponse.json(
    { success: false, error: 'Missing type or id parameter' },
    { status: 400 }
   );
  }
  
  if (type === 'invoice') {
   const invoiceIndex = invoices.findIndex(inv => inv.id === id);
   
   if (invoiceIndex === -1) {
    return NextResponse.json(
     { success: false, error: 'Invoice not found' },
     { status: 404 }
    );
   }
   
   invoices.splice(invoiceIndex, 1);
   
   return NextResponse.json({
    success: true,
    message: 'Invoice deleted successfully'
   });
  }
  
  if (type === 'template') {
   const templateIndex = invoiceTemplates.findIndex(tpl => tpl.id === id);
   
   if (templateIndex === -1) {
    return NextResponse.json(
     { success: false, error: 'Template not found' },
     { status: 404 }
    );
   }
   
   // Soft delete by setting isActive to false
   invoiceTemplates[templateIndex].isActive = false;
   invoiceTemplates[templateIndex].updatedAt = new Date().toISOString();
   
   return NextResponse.json({
    success: true,
    message: 'Template deleted successfully'
   });
  }
  
  return NextResponse.json(
   { success: false, error: 'Invalid request type' },
   { status: 400 }
  );
  
 } catch (error) {
  console.error('Error deleting billing item:', error);
  return NextResponse.json(
   { success: false, error: 'Failed to delete billing item' },
   { status: 500 }
  );
 }
}