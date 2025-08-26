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
import path from 'path';
import fs from 'fs';

// Define pricing functions locally to avoid server-side import issues
const safePricingTiers = {
  'Tier 1': [1.80, 1.50, 1.45, 1.42, 1.38, 1.35],
  'Tier 2': [2.20, 1.60, 1.50, 1.45, 1.40, 1.35],
  'Tier 3': [2.40, 1.70, 1.60, 1.47, 1.44, 1.41]
};

const safeCalculateUnitPrice = (quantity: number, tierName: string = 'Tier 2'): number => {
  try {
    const tiers = safePricingTiers[tierName as keyof typeof safePricingTiers] || safePricingTiers['Tier 2'];
    
    if (quantity >= 10000) return tiers[5];
    if (quantity >= 2880) return tiers[4];
    if (quantity >= 1152) return tiers[3];
    if (quantity >= 576) return tiers[2];
    if (quantity >= 144) return tiers[1];
    return tiers[0];
  } catch (error) {
    console.warn('Price calculation fallback for quantity:', quantity);
    return 1.50; // Safe fallback price
  }
};

// Function to get logo as base64 data URI
const getLogoDataUri = (): string => {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    const base64 = logoBuffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn('Could not load logo, using fallback');
    // Return empty string to hide logo if it fails
    return '';
  }
};

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
  logoImage: {
    width: 140,
    height: 45,
    marginBottom: 10,
    objectFit: 'contain'
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
    padding: 14,
    borderBottom: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 45
  },
  tableCol1: {
    width: '45%'
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
    width: '25%',
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
    marginTop: 2,
    lineHeight: 1.3
  },
  productDetails: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 3,
    fontStyle: 'italic'
  },
  priceBreakdown: {
    fontSize: 8,
    color: '#059669',
    marginTop: 2,
    fontWeight: 'bold'
  },
  savingsIndicator: {
    fontSize: 8,
    color: '#dc2626',
    marginTop: 1
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

  const formatProductDescription = (item: InvoiceItem) => {
    let details: string[] = [];
    
    // Parse item description if it's JSON
    try {
      const parsedDesc = typeof item.description === 'string' ? JSON.parse(item.description) : item.description;
      
      if (parsedDesc && typeof parsedDesc === 'object') {
        if (parsedDesc.color) details.push(`Color: ${parsedDesc.color}`);
        if (parsedDesc.size) details.push(`Size: ${parsedDesc.size}`);
        if (parsedDesc.logo) details.push(`Logo: ${parsedDesc.logo}`);
        if (parsedDesc.accessories) details.push(`Accessories: ${parsedDesc.accessories}`);
        if (parsedDesc.closure) details.push(`Closure: ${parsedDesc.closure}`);
      }
    } catch {
      // If not JSON, treat as plain text
      return item.description;
    }
    
    return details.length > 0 ? details.join(' • ') : item.description;
  };

  // Use imported tier-based pricing functions
  
  const getTierPricingInfo = (quantity: number) => {
    // Use Tier 2 as default (matches dashboard logic)
    const currentTierPrice = safeCalculateUnitPrice(quantity, 'Tier 2');
    const nextTierThreshold = getNextPricingTier(quantity);
    
    let savings = 0;
    let nextTierPrice = currentTierPrice;
    let showSavings = false;
    
    // Calculate actual savings if there's a next tier
    if (nextTierThreshold) {
      nextTierPrice = safeCalculateUnitPrice(nextTierThreshold.threshold, 'Tier 2');
      const currentTotal = currentTierPrice * quantity;
      const nextTierTotal = nextTierPrice * quantity;
      savings = currentTotal - nextTierTotal;
      showSavings = savings > 0;
    }
    
    return {
      currentPrice: currentTierPrice,
      nextTierPrice,
      savings,
      showSavings,
      threshold: nextTierThreshold?.threshold,
      unitsToNext: nextTierThreshold ? nextTierThreshold.threshold - quantity : 0
    };
  };
  
  const getNextPricingTier = (currentQuantity: number) => {
    const tiers = [144, 576, 1152, 2880, 10000];
    const nextTier = tiers.find(tier => tier > currentQuantity);
    return nextTier ? { threshold: nextTier } : null;
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
      phone: customerInfo.phone || (doc.customer as any)?.phone || '',
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
            {getLogoDataUri() && (
              <Image
                style={styles.logoImage}
                src={getLogoDataUri()}
              />
            )}
            <Text style={styles.companyTagline}>Custom Baseball Caps & Accessories</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{doc.number}</Text>
            <Text style={styles.invoiceNumber}>Order ID: #{doc.order.id.slice(-8)}</Text>
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
            <Text style={styles.addressText}>US Custom Caps</Text>
            <Text style={styles.addressText}>Custom Baseball Caps</Text>
            <Text style={styles.addressText}>support@uscustomcaps.com</Text>
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
          
          {doc.items.map((item, index) => {
            const formattedDescription = formatProductDescription(item);
            const tierInfo = getTierPricingInfo(item.quantity);
            
            return (
              <View key={index} style={styles.tableRow}>
                <View style={styles.tableCol1}>
                  <Text style={styles.tableCellText}>{item.name}</Text>
                  {formattedDescription && (
                    <Text style={styles.tableCellDescription}>{formattedDescription}</Text>
                  )}
                  {tierInfo.showSavings && (
                    <>
                      <Text style={styles.priceBreakdown}>
                        Tier 2 Pricing: {item.quantity} units
                      </Text>
                      <Text style={styles.savingsIndicator}>
                        Next tier at {tierInfo.threshold} units: {formatCurrency(tierInfo.nextTierPrice)}/unit
                      </Text>
                    </>
                  )}
                </View>
                <View style={styles.tableCol2}>
                  <Text style={styles.tableCellText}>{item.quantity}</Text>
                  {item.quantity >= 144 && (
                    <Text style={styles.productDetails}>Volume Pricing</Text>
                  )}
                </View>
                <View style={styles.tableCol3}>
                  <Text style={styles.tableCellText}>{formatCurrency(item.unitPrice)}</Text>
                  {tierInfo.showSavings && (
                    <Text style={[styles.productDetails, { color: '#059669' }]}>
                      Save {formatCurrency(tierInfo.nextTierPrice)} at {tierInfo.threshold}+ units
                    </Text>
                  )}
                </View>
                <View style={styles.tableCol4}>
                  <Text style={styles.tableCellText}>{formatCurrency(item.total)}</Text>
                  {item.quantity >= 144 && (
                    <Text style={styles.productDetails}>
                      (Volume tier pricing)
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(doc.subtotal)}</Text>
          </View>
          
          {Number(doc.discount) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Additional Discount:</Text>
              <Text style={styles.summaryValue}>-{formatCurrency(doc.discount)}</Text>
            </View>
          )}
          
          {Number(doc.shipping) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping & Handling:</Text>
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
            <Text style={styles.totalLabel}>Total Amount Due:</Text>
            <Text style={styles.totalValue}>{formatCurrency(doc.total)}</Text>
          </View>
        </View>

        {/* Product Specifications */}
        {(() => {
          const hasCustomizations = doc.items.some(item => {
            try {
              const parsedDesc = typeof item.description === 'string' ? JSON.parse(item.description) : item.description;
              return parsedDesc && typeof parsedDesc === 'object' && 
                     (parsedDesc.color || parsedDesc.size || parsedDesc.logo || parsedDesc.accessories || parsedDesc.closure);
            } catch {
              return false;
            }
          });
          
          return hasCustomizations && (
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Product Specifications & Customizations:</Text>
              {doc.items.map((item, index) => {
                try {
                  const parsedDesc = typeof item.description === 'string' ? JSON.parse(item.description) : item.description;
                  if (parsedDesc && typeof parsedDesc === 'object') {
                    return (
                      <View key={index} style={{ marginBottom: 8 }}>
                        <Text style={[styles.notesText, { fontWeight: 'bold' }]}>{item.name}:</Text>
                        {parsedDesc.color && <Text style={styles.notesText}>• Color: {parsedDesc.color}</Text>}
                        {parsedDesc.size && <Text style={styles.notesText}>• Size: {parsedDesc.size}</Text>}
                        {parsedDesc.logo && <Text style={styles.notesText}>• Logo Details: {parsedDesc.logo}</Text>}
                        {parsedDesc.accessories && <Text style={styles.notesText}>• Accessories: {parsedDesc.accessories}</Text>}
                        {parsedDesc.closure && <Text style={styles.notesText}>• Closure Type: {parsedDesc.closure}</Text>}
                      </View>
                    );
                  }
                } catch {
                  return null;
                }
                return null;
              })}
            </View>
          );
        })()}

        {/* Notes */}
        {doc.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Notes:</Text>
            <Text style={styles.notesText}>{doc.notes}</Text>
          </View>
        )}

        {/* Payment Terms */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Payment Terms & Information:</Text>
          <Text style={styles.notesText}>
            • Payment is due upon receipt
          </Text>
          <Text style={styles.notesText}>
            • Please reference Invoice #{doc.number} when making payment
          </Text>
          <Text style={styles.notesText}>
            • For bulk orders over 144 units, extended payment terms may be available
          </Text>
          <Text style={styles.notesText}>
            • Questions? Contact our billing team at support@uscustomcaps.com
          </Text>
          {(() => {
            const totalQuantity = doc.items.reduce((acc, item) => acc + item.quantity, 0);
            const hasVolumePricing = totalQuantity >= 144;
            
            return hasVolumePricing && (
              <Text style={[styles.notesText, { color: '#059669', fontWeight: 'bold', marginTop: 5 }]}>
                Volume pricing applied for orders of {totalQuantity} units!
              </Text>
            );
          })()}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business! For questions about this invoice, please contact support@uscustomcaps.com
        </Text>
      </Page>
    </Document>
  );
};