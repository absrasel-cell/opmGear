import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image
} from '@react-pdf/renderer';
import { Invoice, InvoiceItem, User, Order } from '@prisma/client';

// Custom types to match our database query
interface InvoiceCustomer {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  address: any;
}

interface InvoiceOrder {
  id: string;
  productName: string | null;
  createdAt: Date;
  customerInfo: any;
}

interface InvoiceWithDetails extends Invoice {
  items: InvoiceItem[];
  customer: InvoiceCustomer;
  order: InvoiceOrder;
}

interface InvoicePdfProps {
  doc: InvoiceWithDetails;
}

// Use system fonts to avoid external dependency issues
// Font.register removed - using default system fonts

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 20,
    borderBottom: 2,
    borderBottomColor: '#667eea'
  },
  logo: {
    flexDirection: 'column'
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 5
  },
  companyTagline: {
    fontSize: 12,
    color: '#666666'
  },
  invoiceInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  invoiceDate: {
    fontSize: 12,
    color: '#666666'
  },
  billToSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  billToColumn: {
    flexDirection: 'column',
    width: '45%'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  addressText: {
    fontSize: 11,
    color: '#666666',
    lineHeight: 1.4,
    marginBottom: 3
  },
  table: {
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottom: 1,
    borderBottomColor: '#f1f5f9'
  },
  tableCol1: {
    width: '50%'
  },
  tableCol2: {
    width: '12%',
    textAlign: 'center'
  },
  tableCol3: {
    width: '18%',
    textAlign: 'right'
  },
  tableCol4: {
    width: '20%',
    textAlign: 'right'
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase'
  },
  tableCellText: {
    fontSize: 11,
    color: '#4b5563'
  },
  tableCellDescription: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2
  },
  summary: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 20
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
    width: '50%'
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'right',
    width: '60%',
    paddingRight: 20
  },
  summaryValue: {
    fontSize: 11,
    color: '#333333',
    textAlign: 'right',
    width: '40%'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTop: 2,
    borderTopColor: '#667eea',
    width: '50%'
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'right',
    width: '60%',
    paddingRight: 20
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'right',
    width: '40%'
  },
  notesSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderLeft: 4,
    borderLeftColor: '#667eea'
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8
  },
  notesText: {
    fontSize: 10,
    color: '#666666',
    lineHeight: 1.4
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#999999',
    borderTop: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 20
  }
});

export const InvoicePdf: React.FC<InvoicePdfProps> = ({ doc }) => {
  const formatCurrency = (amount: any) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  const getCustomerAddress = () => {
    const customerInfo = typeof doc.order.customerInfo === 'string' 
      ? JSON.parse(doc.order.customerInfo) 
      : doc.order.customerInfo || {};
    
    return {
      name: customerInfo.name || doc.customer.name || 'N/A',
      email: customerInfo.email || doc.customer.email || 'N/A',
      phone: customerInfo.phone || doc.customer.phone || '',
      company: customerInfo.company || doc.customer.company || '',
      address: customerInfo.address || (doc.customer.address as any) || {}
    };
  };

  const customerData = getCustomerAddress();
  const address = customerData.address;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.companyName}>OPM Gear</Text>
            <Text style={styles.companyTagline}>Custom Baseball Caps & Accessories</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{doc.number}</Text>
            <Text style={styles.invoiceNumber}>Order ID: #{doc.order.id}</Text>
            <Text style={styles.invoiceDate}>
              Issue Date: {formatDate(doc.issueDate)}
            </Text>
            {doc.dueDate && (
              <Text style={styles.invoiceDate}>
                Due Date: {formatDate(doc.dueDate)}
              </Text>
            )}
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.billToSection}>
          <View style={styles.billToColumn}>
            <Text style={styles.sectionTitle}>From:</Text>
            <Text style={styles.addressText}>OPM Gear</Text>
            <Text style={styles.addressText}>Custom Baseball Caps</Text>
            <Text style={styles.addressText}>support@opmgear.com</Text>
          </View>
          <View style={styles.billToColumn}>
            <Text style={styles.sectionTitle}>Bill To:</Text>
            <Text style={styles.addressText}>{customerData.name}</Text>
            {customerData.company && (
              <Text style={styles.addressText}>{customerData.company}</Text>
            )}
            <Text style={styles.addressText}>{customerData.email}</Text>
            {customerData.phone && (
              <Text style={styles.addressText}>{customerData.phone}</Text>
            )}
            {address.street && (
              <>
                <Text style={styles.addressText}>{address.street}</Text>
                <Text style={styles.addressText}>
                  {address.city}, {address.state} {address.zipCode}
                </Text>
                {address.country && (
                  <Text style={styles.addressText}>{address.country}</Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.tableCol1}>
              <Text style={styles.tableHeaderText}>Description</Text>
            </View>
            <View style={styles.tableCol2}>
              <Text style={styles.tableHeaderText}>Qty</Text>
            </View>
            <View style={styles.tableCol3}>
              <Text style={styles.tableHeaderText}>Unit Price</Text>
            </View>
            <View style={styles.tableCol4}>
              <Text style={styles.tableHeaderText}>Total</Text>
            </View>
          </View>
          
          {doc.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.tableCol1}>
                <Text style={styles.tableCellText}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.tableCellDescription}>{item.description}</Text>
                )}
              </View>
              <View style={styles.tableCol2}>
                <Text style={styles.tableCellText}>{item.quantity}</Text>
              </View>
              <View style={styles.tableCol3}>
                <Text style={styles.tableCellText}>{formatCurrency(item.unitPrice)}</Text>
              </View>
              <View style={styles.tableCol4}>
                <Text style={styles.tableCellText}>{formatCurrency(item.total)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(doc.subtotal)}</Text>
          </View>
          
          {Number(doc.discount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount:</Text>
              <Text style={styles.summaryValue}>-{formatCurrency(doc.discount)}</Text>
            </View>
          )}
          
          {Number(doc.shipping) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(doc.shipping)}</Text>
            </View>
          )}
          
          {Number(doc.tax) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(doc.tax)}</Text>
            </View>
          )}
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(doc.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {doc.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes:</Text>
            <Text style={styles.notesText}>{doc.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business! For questions about this invoice, please contact support@opmgear.com
        </Text>
      </Page>
    </Document>
  );
};