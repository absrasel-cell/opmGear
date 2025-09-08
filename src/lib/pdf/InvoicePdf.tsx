import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts (if available)
try {
  Font.register({
    family: 'Inter',
    src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
  });
} catch (error) {
  console.warn('Font registration failed, using default fonts');
}

// Define styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    paddingTop: 35,
    paddingBottom: 65,
    paddingHorizontal: 35,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#2563eb',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 15,
    padding: 10,
    border: '1px solid #e5e7eb',
    borderRadius: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '30%',
    fontSize: 10,
    color: '#6b7280',
  },
  value: {
    width: '70%',
    fontSize: 10,
    color: '#111827',
  },
  itemsTable: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1px solid #e5e7eb',
  },
  col1: { width: '40%', fontSize: 9 },
  col2: { width: '20%', fontSize: 9, textAlign: 'center' },
  col3: { width: '20%', fontSize: 9, textAlign: 'right' },
  col4: { width: '20%', fontSize: 9, textAlign: 'right' },
  totalSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 4,
    width: '50%',
  },
  totalLabel: {
    width: '70%',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalValue: {
    width: '30%',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 35,
    right: 35,
    textAlign: 'center',
    fontSize: 8,
    color: '#6b7280',
  },
});

interface InvoicePdfProps {
  doc: {
    id: string;
    number: string;
    issueDate: string;
    dueDate: string;
    status: string;
    subtotal: number;
    tax: number;
    total: number;
    customer?: {
      name?: string;
      email?: string;
      company?: string;
      address?: any;
    };
    order?: {
      id: string;
      productName?: string;
      createdAt: string;
    };
    items?: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
  };
}

export const InvoicePdf: React.FC<InvoicePdfProps> = ({ doc }) => {
  // Safely extract values with fallbacks
  const invoiceNumber = doc?.number || 'N/A';
  const issueDate = doc?.issueDate ? new Date(doc.issueDate).toLocaleDateString() : 'N/A';
  const dueDate = doc?.dueDate ? new Date(doc.dueDate).toLocaleDateString() : 'N/A';
  const status = doc?.status || 'DRAFT';
  
  const customerName = doc?.customer?.name || 'N/A';
  const customerEmail = doc?.customer?.email || 'N/A';
  const customerCompany = doc?.customer?.company || '';
  
  const orderNumber = doc?.order?.id || 'N/A';
  const productName = doc?.order?.productName || 'Custom Product';
  const orderDate = doc?.order?.createdAt ? new Date(doc.order.createdAt).toLocaleDateString() : 'N/A';
  
  const subtotal = typeof doc?.subtotal === 'number' ? doc.subtotal : 0;
  const tax = typeof doc?.tax === 'number' ? doc.tax : 0;
  const total = typeof doc?.total === 'number' ? doc.total : 0;
  
  const items = Array.isArray(doc?.items) ? doc.items : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Company Info */}
        <View style={styles.section}>
          <Text style={styles.header}>US CUSTOM CAPS</Text>
          <View style={styles.row}>
            <Text style={styles.value}>Owner: Joseph Benise</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.value}>Phone: +1 (678) 858-7893</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.value}>Address: 957 Hwy 85 Connector, Brooks, GA 30205, United States</Text>
          </View>
        </View>
        
        <Text style={{...styles.header, fontSize: 20, marginTop: 20, marginBottom: 20}}>INVOICE</Text>
        
        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.title}>Invoice Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice Number:</Text>
            <Text style={styles.value}>{invoiceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Issue Date:</Text>
            <Text style={styles.value}>{issueDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Due Date:</Text>
            <Text style={styles.value}>{dueDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{status}</Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.title}>Bill To</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{customerEmail}</Text>
          </View>
          {customerCompany && (
            <View style={styles.row}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{customerCompany}</Text>
            </View>
          )}
        </View>

        {/* Order Information */}
        <View style={styles.section}>
          <Text style={styles.title}>Order Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Order Number:</Text>
            <Text style={styles.value}>{orderNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Product:</Text>
            <Text style={styles.value}>{productName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Order Date:</Text>
            <Text style={styles.value}>{orderDate}</Text>
          </View>
        </View>

        {/* Items Table */}
        {items.length > 0 && (
          <View style={styles.itemsTable}>
            <Text style={styles.title}>Invoice Items</Text>
            
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>Description</Text>
              <Text style={styles.col2}>Quantity</Text>
              <Text style={styles.col3}>Unit Price</Text>
              <Text style={styles.col4}>Total</Text>
            </View>
            
            {/* Table Rows */}
            {items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>{item?.description || 'Item'}</Text>
                <Text style={styles.col2}>{item?.quantity || 0}</Text>
                <Text style={styles.col3}>${(item?.unitPrice || 0).toFixed(2)}</Text>
                <Text style={styles.col4}>${(item?.total || 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax:</Text>
            <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          US Custom Caps | 957 Hwy 85 Connector, Brooks, GA 30205 | Phone: +1 (678) 858-7893 | Thank you for your business!
        </Text>
      </Page>
    </Document>
  );
};