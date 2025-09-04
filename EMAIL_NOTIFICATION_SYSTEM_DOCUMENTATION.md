# Email Notification System Documentation

## Overview

The US Custom Cap platform now features a comprehensive email notification system designed to handle two distinct types of quote requests:

1. **Traditional Quotes**: Simple form-based quote requests
2. **AI-Generated Quotes**: Advanced AI chat quotes with file attachments and logo analysis

## Architecture

### Components

- **Email Templates** (`/src/lib/email/templates/index.ts`)
- **Notification Service** (`/src/lib/email/notification-service.ts`)
- **File Attachment Helper** (`/src/lib/email/file-attachment-helper.ts`)
- **Resend Integration** (`/src/lib/resend.ts`)

### Email Types

#### Traditional Quote Emails

**Customer Receipt Email**:
- Template: `traditionalQuoteReceipt`
- Sent to: Customer email
- Subject: `Quote Request Received #[ID] - US Custom Cap`
- Content: Receipt confirmation with project details and timeline

**Admin Notification Email**:
- Template: `adminTraditionalQuoteNotification`
- Sent to: Admin team emails
- Subject: `New Traditional Quote Request #[ID] - Action Required`
- Content: Complete quote details, customer info, and action items

#### AI-Generated Quote Emails

**Customer Receipt Email**:
- Template: `aiQuoteReceipt`
- Sent to: Customer email
- Subject: `AI Quote Generated #[ID] - US Custom Cap`
- Content: AI analysis results, cost breakdown, and next steps

**Admin Notification Email**:
- Template: `adminAIQuoteNotification`
- Sent to: Admin team emails (with file attachments)
- Subject: `New AI Quote #[ID] - Review Required`
- Content: AI analysis data, customer files, cost calculations, and review checklist

## Email Templates

### Design System Integration

All email templates use the existing US Custom Cap design system:
- **Glass Morphism** styling with backdrop blur effects
- **Lime Green** primary color (#84cc16)
- **Professional Typography** with proper hierarchy
- **Responsive Design** for all email clients
- **Brand Consistency** with company colors and messaging

### Template Features

#### Traditional Quote Template
```typescript
{
  id: string;
  productName: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  requirements: {
    quantity: string;
    colors: string;
    sizes: string;
    customization: string;
    timeline: string;
    additionalNotes?: string;
  };
  // ... additional fields
}
```

#### AI Quote Template
```typescript
{
  id: string;
  sessionId: string;
  productType: string;
  customerName?: string;
  customerEmail?: string;
  quantities?: { quantity: number };
  estimatedCosts?: {
    baseProductCost?: number;
    logosCost?: number;
    deliveryCost?: number;
    total?: number;
  };
  uploadedFiles?: string[];
  logoFiles?: string[];
  // ... additional fields
}
```

## File Attachment System

### Supported File Types

**Images**: PNG, JPEG, GIF, SVG, WebP, BMP, TIFF  
**Documents**: PDF, TXT, RTF  
**Design Files**: AI, EPS, PSD, Sketch  
**Archives**: ZIP, RAR, 7Z  
**Office Files**: DOC, DOCX, XLS, XLSX, PPT, PPTX

### Attachment Limits

- **Maximum File Size**: 10MB per file
- **Maximum Total Size**: 20MB per email
- **File Count**: No explicit limit (subject to size constraints)

### File Processing

1. **Download from Supabase Storage**: Files are retrieved from cloud storage
2. **Content Type Detection**: Automatic MIME type detection
3. **Size Validation**: Files exceeding limits are skipped with notification
4. **Email Integration**: Valid files attached to admin notifications

### Error Handling

- Files that cannot be downloaded are logged and skipped
- Size limit violations are reported in email summary
- Network errors don't block email sending

## API Integration

### Traditional Quotes (`/api/quote-requests`)

**POST Request Flow**:
1. Validate quote data
2. Save to database (`Quote` model)
3. Send customer receipt email
4. Send admin notification email
5. Return success response

**Error Handling**:
- Database failures trigger temporary quote ID system
- Email failures don't block quote submission
- Retry logic with exponential backoff

### AI Quotes (`/api/support/save-quote`)

**POST Request Flow**:
1. Validate AI quote data
2. Save/update database (`QuoteOrder` model)
3. Generate PDF (background task)
4. Process file attachments
5. Send customer receipt email
6. Send admin notification with attachments
7. Return success response

**Enhanced Features**:
- File attachment processing and validation
- PDF generation integration
- Comprehensive AI analysis data
- Logo file categorization

## Environment Configuration

### Required Variables

```env
# Email Service (Resend)
RESEND_API_KEY="re_..."
FROM_EMAIL="noreply@uscustomcap.com"

# Email Recipients
ADMIN_EMAIL="admin@uscustomcap.com"
QUOTES_EMAIL="quotes@uscustomcap.com"

# Database & Storage
DATABASE_URL="postgresql://..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

### Optional Variables

```env
# Development/Testing
NODE_ENV="development"  # Enables test endpoints
```

## Notification Service Features

### Enhanced Reliability

- **Retry Logic**: Up to 3 retry attempts with exponential backoff
- **Fallback Notifications**: Critical failure alerts sent to admin
- **Error Aggregation**: Comprehensive error logging and reporting
- **Background Processing**: Non-blocking email sending

### Service Configuration

```typescript
const emailNotificationService = new EmailNotificationService({
  retryAttempts: 3,
  retryDelay: 1000,
  fallbackEmail: 'admin@uscustomcap.com'
});
```

### Monitoring & Logging

- **Success Tracking**: Detailed logging for successful sends
- **Error Reporting**: Comprehensive error capture and analysis
- **Performance Metrics**: Processing time and attachment statistics
- **Fallback Alerts**: Automatic failure notifications to admin team

## Testing

### Manual Testing Endpoints

**Test Traditional Quote Email**:
```
GET /api/test-email-notifications?type=traditional&email=test@example.com
```

**Test AI Quote Email**:
```
GET /api/test-email-notifications?type=ai&email=test@example.com
```

### Test Data Features

- **Mock Quote Data**: Realistic test scenarios
- **File Attachment Simulation**: Test attachment processing
- **Error Simulation**: Verify error handling paths
- **Email Template Validation**: Visual template testing

## Usage Examples

### Traditional Quote Implementation

```typescript
import { emailNotificationService } from '@/lib/email/notification-service';

const result = await emailNotificationService.sendTraditionalQuoteNotifications({
  id: quote.id,
  productName: 'Custom Baseball Cap',
  customerInfo: {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-0123',
    company: 'Example Corp'
  },
  requirements: {
    quantity: '500 pieces',
    colors: 'Navy, White',
    sizes: 'S, M, L, XL',
    customization: 'Embroidery',
    timeline: '2-4 weeks'
  },
  status: 'PENDING',
  createdAt: new Date().toISOString()
});
```

### AI Quote Implementation

```typescript
const result = await emailNotificationService.sendAIQuoteNotifications({
  id: 'AI-QUOTE-123',
  sessionId: 'session-456',
  productType: 'Premium Baseball Cap',
  customerEmail: 'customer@example.com',
  quantities: { quantity: 288 },
  estimatedCosts: {
    baseProductCost: 2304.00,
    logosCost: 864.00,
    deliveryCost: 295.00,
    total: 3463.00
  },
  uploadedFiles: ['https://storage.example.com/logo.png'],
  createdAt: new Date().toISOString()
}, ['https://storage.example.com/logo.png']);
```

## Security Considerations

### Email Security

- **Sender Validation**: All emails sent from verified domain
- **Content Sanitization**: HTML content is properly escaped
- **Rate Limiting**: Built-in retry logic prevents abuse
- **Access Control**: Test endpoints restricted to development

### File Attachment Security

- **Content Type Validation**: Only allowed file types processed
- **Size Limits**: Prevents abuse through oversized files
- **Storage Integration**: Secure file access through Supabase
- **Error Handling**: Graceful failure without data exposure

### Privacy Protection

- **Recipient Validation**: Email addresses validated before sending
- **Data Minimization**: Only necessary data included in emails
- **Secure Storage**: Temporary file processing with cleanup
- **Audit Logging**: Comprehensive logging for troubleshooting

## Troubleshooting

### Common Issues

**Email Not Sent**:
- Check RESEND_API_KEY configuration
- Verify FROM_EMAIL domain setup
- Review email template syntax
- Check network connectivity

**File Attachments Missing**:
- Verify Supabase storage permissions
- Check file URL accessibility
- Review file size limits
- Validate content types

**Template Rendering Issues**:
- Check template data structure
- Verify required fields presence
- Test with mock data
- Review HTML syntax

### Debugging Tools

**Email Test Endpoint**:
```bash
curl "http://localhost:3000/api/test-email-notifications?type=traditional&email=test@example.com"
```

**Log Analysis**:
```bash
# Search for email-related logs
grep "📧\\|📎\\|✅\\|❌" logs/app.log

# Monitor notification service
tail -f logs/app.log | grep "EmailNotificationService"
```

**Database Queries**:
```sql
-- Check recent quotes
SELECT id, status, "customerInfo", created_at 
FROM "Quote" 
ORDER BY created_at DESC 
LIMIT 10;

-- Check AI quotes with files
SELECT id, "sessionId", "customerEmail", "uploadedFiles"
FROM "QuoteOrder" 
WHERE "uploadedFiles" != '[]'::jsonb 
ORDER BY created_at DESC;
```

## Performance Optimization

### Background Processing

- **Asynchronous Sending**: Emails sent in background using `setImmediate`
- **Non-blocking Response**: Quote submission completes before email sending
- **Parallel Processing**: Customer and admin emails sent concurrently
- **Resource Management**: File attachments processed efficiently

### Caching Strategies

- **Template Compilation**: Email templates cached in memory
- **File Type Detection**: MIME type mapping cached
- **Configuration Values**: Environment variables cached
- **Connection Pooling**: Database connections reused

### Monitoring Metrics

- **Email Send Rate**: Track successful/failed sends per minute
- **Attachment Processing Time**: Monitor file download and processing
- **Template Rendering Performance**: Track HTML generation time
- **Queue Depth**: Monitor background task backlog

## Future Enhancements

### Planned Features

- **Email Preferences**: Customer opt-in/opt-out management
- **Template Customization**: Admin-configurable email templates  
- **Delivery Analytics**: Email open/click tracking integration
- **Webhook Integration**: Real-time delivery status updates
- **Multi-language Support**: Localized email templates
- **Advanced Attachments**: PDF generation for quotes
- **Email Scheduling**: Delayed sending capabilities
- **A/B Testing**: Template performance comparison

### Integration Roadmap

- **CRM Integration**: Sync with customer management systems
- **Marketing Automation**: Integration with email marketing tools
- **Analytics Dashboard**: Email performance reporting
- **Mobile Notifications**: Push notification fallbacks
- **SMS Integration**: Multi-channel notification support