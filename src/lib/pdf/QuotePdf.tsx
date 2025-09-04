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
import path from 'path';
import fs from 'fs';

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

// Custom types for QuoteOrder with details
interface QuoteOrderCustomer {
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: any;
}

interface QuoteOrderFile {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  category: string;
  isLogo: boolean;
  uploadedAt: string;
  filePath?: string;
  description?: string;
}

interface QuoteOrderWithDetails {
  id: string;
  sessionId: string;
  title: string | null;
  status: string;
  priority: string;
  complexity: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerCompany: string | null;
  customerAddress: any;
  productType: string | null;
  quantities: any;
  colors: any;
  logoRequirements: any;
  customizationOptions: any;
  extractedSpecs: any;
  estimatedCosts: any;
  aiSummary: string | null;
  additionalRequirements: string | null;
  customerInstructions: string | null;
  internalNotes: string | null;
  tags: string[];
  files?: QuoteOrderFile[];
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
}

interface QuotePdfProps {
  quote: QuoteOrderWithDetails;
}

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
    borderBottomColor: '#10b981'
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
    color: '#10b981',
    marginBottom: 5
  },
  companyTagline: {
    fontSize: 12,
    color: '#666666'
  },
  quoteInfo: {
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  quoteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8
  },
  quoteNumber: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4
  },
  quoteDate: {
    fontSize: 12,
    color: '#666666'
  },
  statusBadge: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    textAlign: 'center'
  },
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  customerColumn: {
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
  specsSection: {
    marginBottom: 20
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20
  },
  specCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderLeft: 3,
    borderLeftColor: '#10b981'
  },
  specTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  specItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  specLabel: {
    fontSize: 10,
    color: '#6b7280',
    width: '50%'
  },
  specValue: {
    fontSize: 10,
    color: '#111827',
    width: '50%',
    textAlign: 'right'
  },
  logoSection: {
    marginBottom: 20
  },
  logoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  logoCard: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    borderLeft: 3,
    borderLeftColor: '#f59e0b'
  },
  logoText: {
    fontSize: 10,
    color: '#92400e',
    marginBottom: 2
  },
  filesSection: {
    marginBottom: 20
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginBottom: 6,
    borderLeft: 3,
    borderLeftColor: '#3b82f6'
  },
  fileName: {
    fontSize: 10,
    color: '#1e293b',
    fontWeight: 'bold'
  },
  fileDetails: {
    fontSize: 9,
    color: '#64748b'
  },
  costingSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    borderLeft: 4,
    borderLeftColor: '#10b981'
  },
  costTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 15,
    textAlign: 'center'
  },
  costGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  costLabel: {
    fontSize: 12,
    color: '#374151',
    width: '70%'
  },
  costValue: {
    fontSize: 12,
    color: '#059669',
    fontWeight: 'bold',
    width: '30%',
    textAlign: 'right'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTop: 2,
    borderTopColor: '#10b981'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065f46',
    width: '70%'
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    width: '30%',
    textAlign: 'right'
  },
  notesSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderLeft: 4,
    borderLeftColor: '#10b981'
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
    lineHeight: 1.4,
    marginBottom: 6
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

export const QuotePdf: React.FC<QuotePdfProps> = ({ quote }) => {
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

  const getCustomerData = () => {
    return {
      name: quote.customerName || 'N/A',
      email: quote.customerEmail || 'N/A',
      phone: quote.customerPhone || '',
      company: quote.customerCompany || '',
      address: quote.customerAddress || {}
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'NORMAL': return '#10b981';
      case 'LOW': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QUOTED': return '#3b82f6';
      case 'CONVERTED': return '#10b981';
      case 'COMPLETED': return '#8b5cf6';
      case 'IN_PROGRESS': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const customerData = getCustomerData();
  const address = customerData.address;
  
  // Parse specifications
  const specs = quote.extractedSpecs || {};
  const costs = quote.estimatedCosts || {};
  const logoReqs = quote.logoRequirements || {};
  const customizations = quote.customizationOptions || {};

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
          <View style={styles.quoteInfo}>
            <Text style={styles.quoteTitle}>QUOTE REQUEST</Text>
            <Text style={styles.quoteNumber}>#{quote.id.slice(-8)}</Text>
            <Text style={styles.quoteNumber}>Session: {quote.sessionId.slice(-8)}</Text>
            <Text style={styles.quoteDate}>
              Created: {formatDate(quote.createdAt)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quote.status) }]}>
              <Text style={{ color: '#ffffff', fontSize: 10 }}>{quote.status.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.customerSection}>
          <View style={styles.customerColumn}>
            <Text style={styles.sectionTitle}>From:</Text>
            <Text style={styles.addressText}>US Custom Caps</Text>
            <Text style={styles.addressText}>Custom Baseball Caps</Text>
            <Text style={styles.addressText}>support@uscustomcaps.com</Text>
          </View>
          <View style={styles.customerColumn}>
            <Text style={styles.sectionTitle}>Customer:</Text>
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

        {/* Product Specifications */}
        <View style={styles.specsSection}>
          <Text style={styles.sectionTitle}>Product Specifications</Text>
          
          <View style={styles.specsGrid}>
            {/* Product Details Card */}
            <View style={styles.specCard}>
              <Text style={styles.specTitle}>Product Details</Text>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Type:</Text>
                <Text style={styles.specValue}>{quote.productType || 'Custom Cap'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Title:</Text>
                <Text style={styles.specValue}>{quote.title || 'N/A'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Priority:</Text>
                <Text style={[styles.specValue, { color: getPriorityColor(quote.priority) }]}>
                  {quote.priority}
                </Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Complexity:</Text>
                <Text style={styles.specValue}>{quote.complexity}</Text>
              </View>
            </View>

            {/* Specifications Card */}
            {specs && Object.keys(specs).length > 0 && (
              <View style={styles.specCard}>
                <Text style={styles.specTitle}>Cap Specifications</Text>
                {specs.profile && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Profile:</Text>
                    <Text style={styles.specValue}>{specs.profile}</Text>
                  </View>
                )}
                {specs.billShape && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Bill Shape:</Text>
                    <Text style={styles.specValue}>{specs.billShape}</Text>
                  </View>
                )}
                {specs.structure && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Structure:</Text>
                    <Text style={styles.specValue}>{specs.structure}</Text>
                  </View>
                )}
                {specs.closure && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Closure:</Text>
                    <Text style={styles.specValue}>{specs.closure}</Text>
                  </View>
                )}
                {specs.fabric && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Fabric:</Text>
                    <Text style={styles.specValue}>{specs.fabric}</Text>
                  </View>
                )}
                {specs.sizes && Array.isArray(specs.sizes) && specs.sizes.length > 0 && (
                  <View style={styles.specItem}>
                    <Text style={styles.specLabel}>Sizes:</Text>
                    <Text style={styles.specValue}>{specs.sizes.join(', ')}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Quantities Card */}
            {quote.quantities && (
              <View style={styles.specCard}>
                <Text style={styles.specTitle}>Quantities</Text>
                {typeof quote.quantities === 'object' && Object.entries(quote.quantities).map(([key, value]) => (
                  <View key={key} style={styles.specItem}>
                    <Text style={styles.specLabel}>{key}:</Text>
                    <Text style={styles.specValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Colors Card */}
            {quote.colors && (
              <View style={styles.specCard}>
                <Text style={styles.specTitle}>Colors</Text>
                {typeof quote.colors === 'object' && Object.entries(quote.colors).map(([key, value]) => (
                  <View key={key} style={styles.specItem}>
                    <Text style={styles.specLabel}>{key}:</Text>
                    <Text style={styles.specValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Logo Requirements */}
        {logoReqs && logoReqs.logos && Array.isArray(logoReqs.logos) && logoReqs.logos.length > 0 && (
          <View style={styles.logoSection}>
            <Text style={styles.sectionTitle}>Logo Requirements</Text>
            <View style={styles.logoGrid}>
              {logoReqs.logos.map((logo: any, index: number) => (
                <View key={index} style={styles.logoCard}>
                  <Text style={styles.logoText}>Location: {logo.location || 'N/A'}</Text>
                  <Text style={styles.logoText}>Type: {logo.type || 'N/A'}</Text>
                  <Text style={styles.logoText}>Size: {logo.size || 'N/A'}</Text>
                  {logo.cost && (
                    <Text style={[styles.logoText, { fontWeight: 'bold' }]}>
                      Cost: {formatCurrency(logo.cost)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Uploaded Files */}
        {quote.files && quote.files.length > 0 && (
          <View style={styles.filesSection}>
            <Text style={styles.sectionTitle}>Uploaded Files ({quote.files.length})</Text>
            {quote.files.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View>
                  <Text style={styles.fileName}>{file.originalName}</Text>
                  <Text style={styles.fileDetails}>
                    {file.fileType} • {Math.round(file.fileSize / 1024)} KB • 
                    {file.category} {file.isLogo ? '• Logo' : ''}
                  </Text>
                  {file.description && (
                    <Text style={styles.fileDetails}>{file.description}</Text>
                  )}
                </View>
                <Text style={[styles.fileDetails, { textAlign: 'right' }]}>
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Cost Breakdown */}
        {costs && Object.keys(costs).length > 0 && (
          <View style={styles.costingSection}>
            <Text style={styles.costTitle}>Cost Estimate</Text>
            
            {costs.baseProductCost && (
              <View style={styles.costGrid}>
                <Text style={styles.costLabel}>Base Product Cost:</Text>
                <Text style={styles.costValue}>{formatCurrency(costs.baseProductCost)}</Text>
              </View>
            )}
            
            {costs.logosCost && (
              <View style={styles.costGrid}>
                <Text style={styles.costLabel}>Logos & Setup:</Text>
                <Text style={styles.costValue}>{formatCurrency(costs.logosCost)}</Text>
              </View>
            )}
            
            {costs.deliveryCost && (
              <View style={styles.costGrid}>
                <Text style={styles.costLabel}>Delivery & Shipping:</Text>
                <Text style={styles.costValue}>{formatCurrency(costs.deliveryCost)}</Text>
              </View>
            )}
            
            {customizations.moldCharges && (
              <View style={styles.costGrid}>
                <Text style={styles.costLabel}>Mold Charges:</Text>
                <Text style={styles.costValue}>{formatCurrency(customizations.moldCharges)}</Text>
              </View>
            )}
            
            {costs.total && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Estimated Cost:</Text>
                <Text style={styles.totalValue}>{formatCurrency(costs.total)}</Text>
              </View>
            )}
          </View>
        )}

        {/* AI Summary */}
        {quote.aiSummary && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>AI Analysis Summary:</Text>
            <Text style={styles.notesText}>{quote.aiSummary}</Text>
          </View>
        )}

        {/* Customer Instructions */}
        {quote.customerInstructions && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Customer Instructions:</Text>
            <Text style={styles.notesText}>{quote.customerInstructions}</Text>
          </View>
        )}

        {/* Additional Requirements */}
        {quote.additionalRequirements && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Additional Requirements:</Text>
            <Text style={styles.notesText}>{quote.additionalRequirements}</Text>
          </View>
        )}

        {/* Internal Notes (for admin use) */}
        {quote.internalNotes && (
          <View style={[styles.notesSection, { backgroundColor: '#fef3c7', borderLeftColor: '#f59e0b' }]}>
            <Text style={[styles.notesTitle, { color: '#92400e' }]}>Internal Notes:</Text>
            <Text style={[styles.notesText, { color: '#92400e' }]}>{quote.internalNotes}</Text>
          </View>
        )}

        {/* Tags */}
        {quote.tags && quote.tags.length > 0 && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Tags:</Text>
            <Text style={styles.notesText}>{quote.tags.join(', ')}</Text>
          </View>
        )}

        {/* Quote Terms */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Quote Terms & Information:</Text>
          <Text style={styles.notesText}>
            • This quote is valid for 30 days from the date of issue
          </Text>
          <Text style={styles.notesText}>
            • Final pricing may vary based on artwork complexity and final specifications
          </Text>
          <Text style={styles.notesText}>
            • Production time: 10-15 business days after artwork approval
          </Text>
          <Text style={styles.notesText}>
            • 50% deposit required to begin production
          </Text>
          <Text style={styles.notesText}>
            • Questions? Contact our team at support@uscustomcaps.com
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          US Custom Caps - Professional Custom Cap Manufacturing | support@uscustomcaps.com | Quote #{quote.id.slice(-8)}
        </Text>
      </Page>
    </Document>
  );
};