import { OrderStatus } from '@prisma/client';

// Base email template with your brand styling
export const emailBaseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .header {
            background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 32px 24px;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 24px;
            text-align: center;
            font-size: 14px;
            color: #64748b;
        }
        .button {
            display: inline-block;
            background-color: #84cc16;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            margin: 16px 0;
        }
        .button:hover {
            background-color: #65a30d;
        }
        .order-details {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
        }
        .status-pending { background-color: #fef3c7; color: #92400e; }
        .status-confirmed { background-color: #d1fae5; color: #065f46; }
        .status-processing { background-color: #dbeafe; color: #1e40af; }
        .status-shipped { background-color: #e0e7ff; color: #3730a3; }
        .status-delivered { background-color: #dcfce7; color: #166534; }
        .status-cancelled { background-color: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>US Custom Cap</h1>
            <p>${title}</p>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p><strong>US Custom Cap</strong><br>
            Custom Baseball Caps & Accessories<br>
            <a href="mailto:support@uscustomcap.com" style="color: #84cc16;">support@uscustomcap.com</a></p>
            <p style="margin-top: 16px; font-size: 12px;">
                This email was sent to you because you have an account with US Custom Cap. 
                If you no longer wish to receive these emails, you can 
                <a href="#" style="color: #64748b;">unsubscribe here</a>.
            </p>
        </div>
    </div>
</body>
</html>
`;

// Order status update email template
export const orderStatusTemplate = (order: any, newStatus: OrderStatus, trackingNumber?: string) => {
  const statusMessages = {
    PENDING: 'We\'ve received your order and it\'s being reviewed.',
    CONFIRMED: 'Your order has been confirmed and is being prepared.',
    PROCESSING: 'Your custom caps are being manufactured.',
    SHIPPED: 'Your order is on its way to you!',
    DELIVERED: 'Your order has been delivered successfully.',
    CANCELLED: 'Your order has been cancelled.'
  };

  const statusColors = {
    PENDING: 'status-pending',
    CONFIRMED: 'status-confirmed', 
    PROCESSING: 'status-processing',
    SHIPPED: 'status-shipped',
    DELIVERED: 'status-delivered',
    CANCELLED: 'status-cancelled'
  };

  let content = `
    <h2>Order Status Update</h2>
    <p>Hello ${order.customerInfo?.name || 'Valued Customer'},</p>
    
    <p>Your order <strong>#${order.id}</strong> status has been updated:</p>
    
    <div class="order-details">
        <p><strong>Product:</strong> ${order.productName}</p>
        <p><strong>Status:</strong> <span class="status-badge ${statusColors[newStatus]}">${newStatus}</span></p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
    </div>
    
    <p>${statusMessages[newStatus]}</p>
  `;

  if (newStatus === 'SHIPPED' && trackingNumber) {
    content += `
      <p>You can track your package using the tracking number above with your shipping carrier.</p>
      <a href="#" class="button">Track Package</a>
    `;
  }

  if (newStatus === 'DELIVERED') {
    content += `
      <p>We hope you love your custom caps! If you have any questions or concerns, please don't hesitate to contact us.</p>
      <a href="/dashboard/member" class="button">View Order Details</a>
    `;
  }

  content += `
    <p>Thank you for choosing US Custom Cap!</p>
    <p>Best regards,<br>The US Custom Cap Team</p>
  `;

  return emailBaseTemplate(content, 'Order Status Update');
};

// Welcome email for new users
export const welcomeEmailTemplate = (user: any) => {
  const content = `
    <h2>Welcome to US Custom Cap!</h2>
    <p>Hello ${user.name || user.email},</p>
    
    <p>Thank you for joining US Custom Cap! We're excited to help you create amazing custom baseball caps.</p>
    
    <div class="order-details">
        <h3>Getting Started:</h3>
        <ul style="text-align: left; margin: 16px 0;">
            <li>Browse our extensive collection of cap styles</li>
            <li>Use our advanced customization tools</li>
            <li>Upload your logos and designs</li>
            <li>Get real-time pricing with volume discounts</li>
        </ul>
    </div>
    
    <a href="/customize" class="button">Start Customizing</a>
    
    <p>If you have any questions, our support team is here to help!</p>
    
    <p>Best regards,<br>The US Custom Cap Team</p>
  `;

  return emailBaseTemplate(content, 'Welcome to US Custom Cap');
};

// Invoice email template
export const invoiceEmailTemplate = (invoice: any, order: any) => {
  const content = `
    <h2>Invoice #${invoice.number}</h2>
    <p>Hello ${order.customerInfo?.name || 'Valued Customer'},</p>
    
    <p>Please find your invoice for order <strong>#${order.id}</strong> below:</p>
    
    <div class="order-details">
        <p><strong>Invoice Number:</strong> ${invoice.number}</p>
        <p><strong>Invoice Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</p>
        <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        <p><strong>Amount:</strong> $${invoice.total}</p>
    </div>
    
    <p>You can view and download your invoice using the link below:</p>
    
    <a href="/invoices/${invoice.id}/pdf" class="button">View Invoice</a>
    
    <p>Payment can be made through your dashboard or by contacting our billing team.</p>
    
    <p>Thank you for your business!</p>
    <p>Best regards,<br>The US Custom Cap Team</p>
  `;

  return emailBaseTemplate(content, 'Invoice Ready');
};

// Password reset email template
export const passwordResetTemplate = (resetLink: string, userName?: string) => {
  const content = `
    <h2>Reset Your Password</h2>
    <p>Hello ${userName || 'there'},</p>
    
    <p>We received a request to reset your password for your US Custom Cap account.</p>
    
    <p>Click the button below to create a new password:</p>
    
    <a href="${resetLink}" class="button">Reset Password</a>
    
    <p>This link will expire in 24 hours for security reasons.</p>
    
    <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
    
    <p>Best regards,<br>The US Custom Cap Team</p>
  `;

  return emailBaseTemplate(content, 'Password Reset Request');
};

// Traditional Quote Request Receipt Template
export const traditionalQuoteReceiptTemplate = (quote: any) => {
  const content = `
    <h2>Quote Request Received!</h2>
    <p>Hello ${quote.customerInfo?.name || 'Valued Customer'},</p>
    
    <p>Thank you for your quote request! We've received your information and will prepare a custom quote for your project:</p>
    
    <div class="order-details">
        <p><strong>Product:</strong> ${quote.productName}</p>
        <p><strong>Quote ID:</strong> #${quote.id}</p>
        <p><strong>Submitted:</strong> ${new Date(quote.createdAt).toLocaleDateString()}</p>
        <p><strong>Quantity:</strong> ${quote.requirements?.quantity || 'Not specified'}</p>
        <p><strong>Colors:</strong> ${quote.requirements?.colors || 'Not specified'}</p>
        <p><strong>Timeline:</strong> ${quote.requirements?.timeline || 'Not specified'}</p>
        <p><strong>Customization:</strong> ${quote.requirements?.customization || 'Not specified'}</p>
    </div>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #166534;"><strong>⏰ What happens next?</strong></p>
        <ul style="margin: 8px 0 0 0; color: #166534;">
            <li>Our team will review your requirements</li>
            <li>We'll prepare a detailed quote with pricing</li>
            <li>You'll receive your quote within 24-48 hours</li>
            <li>No obligation - review and decide at your pace</li>
        </ul>
    </div>
    
    <p>If you have any questions in the meantime, feel free to contact us!</p>
    
    <p>Best regards,<br>The US Custom Cap Team</p>
  `;

  return emailBaseTemplate(content, 'Quote Request Received');
};

// AI-Generated Quote Receipt Template
export const aiQuoteReceiptTemplate = (quote: any) => {
  const hasFiles = quote.uploadedFiles && quote.uploadedFiles.length > 0;
  const hasLogos = quote.logoFiles && quote.logoFiles.length > 0;
  const estimatedCosts = quote.estimatedCosts || {};
  
  const content = `
    <h2>AI Quote Generated Successfully! 🎯</h2>
    <p>Hello ${quote.customerName || 'Valued Customer'},</p>
    
    <p>Great news! Our AI system has analyzed your requirements and generated a comprehensive quote for your custom cap project:</p>
    
    <div class="order-details">
        <p><strong>Product:</strong> ${quote.productType || 'Custom Cap'}</p>
        <p><strong>Quote ID:</strong> #${quote.id}</p>
        <p><strong>Generated:</strong> ${new Date(quote.createdAt || Date.now()).toLocaleDateString()}</p>
        ${quote.quantities?.quantity ? `<p><strong>Quantity:</strong> ${quote.quantities.quantity} pieces</p>` : ''}
        ${estimatedCosts.total ? `<p><strong>Estimated Total:</strong> <span style="font-size: 18px; color: #84cc16; font-weight: bold;">$${estimatedCosts.total}</span></p>` : ''}
    </div>
    
    ${estimatedCosts.baseProductCost || estimatedCosts.logosCost || estimatedCosts.deliveryCost ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #334155;">💰 Cost Breakdown</h3>
        ${estimatedCosts.baseProductCost ? `<p style="margin: 4px 0;">Base Product Cost: $${estimatedCosts.baseProductCost}</p>` : ''}
        ${estimatedCosts.logosCost ? `<p style="margin: 4px 0;">Logo Customization: $${estimatedCosts.logosCost}</p>` : ''}
        ${estimatedCosts.deliveryCost ? `<p style="margin: 4px 0;">Delivery: $${estimatedCosts.deliveryCost}</p>` : ''}
    </div>
    ` : ''}
    
    ${hasLogos ? `
    <div style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #a16207;"><strong>🎨 Logo Analysis Completed</strong></p>
        <p style="margin: 8px 0 0 0; color: #a16207;">Your logo files have been analyzed and optimized for the best customization approach.</p>
    </div>
    ` : ''}
    
    ${hasFiles ? `
    <div style="background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #1e40af;"><strong>📎 Files Processed: ${quote.uploadedFiles.length}</strong></p>
        <p style="margin: 8px 0 0 0; color: #1e40af;">All your uploaded files have been reviewed and included in the quote.</p>
    </div>
    ` : ''}
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #166534;"><strong>✨ AI-Powered Benefits</strong></p>
        <ul style="margin: 8px 0 0 0; color: #166534;">
            <li>Instant analysis of your requirements</li>
            <li>Optimized pricing based on your specifications</li>
            <li>Professional logo customization recommendations</li>
            <li>Real-time cost calculations with volume discounts</li>
        </ul>
    </div>
    
    <p>Your quote is ready for review! Our team will also review this AI-generated quote to ensure everything meets your expectations.</p>
    
    <a href="/support" class="button">Continue Chat & Review Quote</a>
    
    <p style="margin-top: 24px;">Questions about your AI-generated quote? Simply reply to this email or continue your conversation in our support chat.</p>
    
    <p>Best regards,<br>The US Custom Cap AI Team</p>
  `;

  return emailBaseTemplate(content, 'AI Quote Generated');
};

// Admin Notification Template for Traditional Quotes
export const adminTraditionalQuoteNotificationTemplate = (quote: any) => {
  const content = `
    <h2>New Traditional Quote Request 📋</h2>
    
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #92400e; font-weight: bold;">⚡ Action Required: Review and respond within 24-48 hours</p>
    </div>
    
    <div class="order-details">
        <h3>📊 Quote Details</h3>
        <p><strong>Quote ID:</strong> #${quote.id}</p>
        <p><strong>Product:</strong> ${quote.productName}</p>
        <p><strong>Submitted:</strong> ${new Date(quote.createdAt).toLocaleDateString()} at ${new Date(quote.createdAt).toLocaleTimeString()}</p>
        <p><strong>Status:</strong> <span class="status-badge status-pending">${quote.status}</span></p>
    </div>
    
    <div class="order-details">
        <h3>👤 Customer Information</h3>
        <p><strong>Name:</strong> ${quote.customerInfo?.name || 'Not provided'}</p>
        <p><strong>Email:</strong> <a href="mailto:${quote.customerInfo?.email}">${quote.customerInfo?.email || 'Not provided'}</a></p>
        <p><strong>Phone:</strong> ${quote.customerInfo?.phone ? `<a href="tel:${quote.customerInfo.phone}">${quote.customerInfo.phone}</a>` : 'Not provided'}</p>
        <p><strong>Company:</strong> ${quote.customerInfo?.company || 'Not provided'}</p>
    </div>
    
    <div class="order-details">
        <h3>📝 Project Requirements</h3>
        <p><strong>Quantity:</strong> ${quote.requirements?.quantity || 'Not specified'}</p>
        <p><strong>Colors:</strong> ${quote.requirements?.colors || 'Not specified'}</p>
        <p><strong>Sizes:</strong> ${quote.requirements?.sizes || 'Not specified'}</p>
        <p><strong>Customization:</strong> ${quote.requirements?.customization || 'Not specified'}</p>
        <p><strong>Timeline:</strong> ${quote.requirements?.timeline || 'Not specified'}</p>
        ${quote.requirements?.additionalNotes ? `<p><strong>Additional Notes:</strong><br>${quote.requirements.additionalNotes}</p>` : ''}
    </div>
    
    ${quote.ipAddress || quote.userAgent ? `
    <div class="order-details">
        <h3>🔍 Technical Info</h3>
        ${quote.ipAddress ? `<p><strong>IP Address:</strong> ${quote.ipAddress}</p>` : ''}
        ${quote.userAgent ? `<p><strong>User Agent:</strong> ${quote.userAgent}</p>` : ''}
    </div>
    ` : ''}
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #166534; font-weight: bold;">💡 Next Steps</p>
        <ul style="margin: 8px 0 0 0; color: #166534;">
            <li>Review customer requirements thoroughly</li>
            <li>Calculate accurate pricing based on specifications</li>
            <li>Prepare detailed quote response</li>
            <li>Contact customer within 24-48 hours</li>
        </ul>
    </div>
    
    <a href="/dashboard/admin/quotes" class="button">View in Admin Dashboard</a>
    
    <p>This is an automated notification from the US Custom Cap quote management system.</p>
  `;

  return emailBaseTemplate(content, 'New Quote Request - Action Required');
};

// Admin Notification Template for AI Quotes
export const adminAIQuoteNotificationTemplate = (quote: any, attachments: any[] = []) => {
  const hasFiles = quote.uploadedFiles && quote.uploadedFiles.length > 0;
  const hasLogos = quote.logoFiles && quote.logoFiles.length > 0;
  const estimatedCosts = quote.estimatedCosts || {};
  
  const content = `
    <h2>New AI-Generated Quote 🤖</h2>
    
    <div style="background-color: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; color: #1e40af; font-weight: bold;">🎯 AI Quote Generated - Review for accuracy and follow up</p>
    </div>
    
    <div class="order-details">
        <h3>📊 Quote Details</h3>
        <p><strong>Quote ID:</strong> #${quote.id}</p>
        <p><strong>Session ID:</strong> ${quote.sessionId}</p>
        <p><strong>Product:</strong> ${quote.productType || 'Custom Cap'}</p>
        <p><strong>Generated:</strong> ${new Date(quote.createdAt || Date.now()).toLocaleDateString()} at ${new Date(quote.createdAt || Date.now()).toLocaleTimeString()}</p>
        <p><strong>Status:</strong> <span class="status-badge status-processing">${quote.status}</span></p>
        ${quote.complexity ? `<p><strong>Complexity:</strong> ${quote.complexity}</p>` : ''}
        ${quote.priority ? `<p><strong>Priority:</strong> ${quote.priority}</p>` : ''}
    </div>
    
    <div class="order-details">
        <h3>👤 Customer Information</h3>
        <p><strong>Name:</strong> ${quote.customerName || 'Not provided'}</p>
        <p><strong>Email:</strong> ${quote.customerEmail ? `<a href="mailto:${quote.customerEmail}">${quote.customerEmail}</a>` : 'Not provided'}</p>
        <p><strong>Phone:</strong> ${quote.customerPhone ? `<a href="tel:${quote.customerPhone}">${quote.customerPhone}</a>` : 'Not provided'}</p>
        <p><strong>Company:</strong> ${quote.customerCompany || 'Not provided'}</p>
    </div>
    
    ${estimatedCosts.total ? `
    <div class="order-details">
        <h3>💰 AI Cost Analysis</h3>
        <p><strong>Estimated Total:</strong> <span style="font-size: 18px; color: #84cc16; font-weight: bold;">$${estimatedCosts.total}</span></p>
        ${quote.quantities?.quantity ? `<p><strong>Quantity:</strong> ${quote.quantities.quantity} pieces</p>` : ''}
        ${estimatedCosts.baseProductCost ? `<p><strong>Base Product Cost:</strong> $${estimatedCosts.baseProductCost}</p>` : ''}
        ${estimatedCosts.logosCost ? `<p><strong>Logo Customization:</strong> $${estimatedCosts.logosCost}</p>` : ''}
        ${estimatedCosts.deliveryCost ? `<p><strong>Delivery:</strong> $${estimatedCosts.deliveryCost}</p>` : ''}
    </div>
    ` : ''}
    
    ${quote.logoRequirements?.logos ? `
    <div class="order-details">
        <h3>🎨 Logo Requirements</h3>
        <p>${JSON.stringify(quote.logoRequirements.logos, null, 2)}</p>
    </div>
    ` : ''}
    
    ${quote.extractedSpecs ? `
    <div class="order-details">
        <h3>📋 Extracted Specifications</h3>
        ${Object.entries(quote.extractedSpecs).map(([key, value]) => 
          value ? `<p><strong>${key}:</strong> ${Array.isArray(value) ? value.join(', ') : value}</p>` : ''
        ).join('')}
    </div>
    ` : ''}
    
    ${hasFiles ? `
    <div class="order-details">
        <h3>📎 Customer Files (${quote.uploadedFiles.length})</h3>
        ${hasLogos ? `<p><strong>Logo Files:</strong> ${quote.logoFiles.length} file(s)</p>` : ''}
        <p><strong>All Files:</strong> ${quote.uploadedFiles.length} file(s) uploaded</p>
        <p><em>All customer files are attached to this email for your review.</em></p>
    </div>
    ` : ''}
    
    ${quote.aiSummary ? `
    <div style="background-color: #f3f4f6; border-left: 4px solid #6b7280; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; font-style: italic; color: #374151;"><strong>AI Summary:</strong> ${quote.aiSummary}</p>
    </div>
    ` : ''}
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #166534; font-weight: bold;">🤖 AI Processing Benefits</p>
        <ul style="margin: 8px 0 0 0; color: #166534;">
            <li>Automatic requirement extraction and analysis</li>
            <li>Real-time cost calculations with current pricing</li>
            <li>Logo file analysis and customization recommendations</li>
            <li>Structured data for easy order conversion</li>
        </ul>
    </div>
    
    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #92400e; font-weight: bold;">👀 Review Checklist</p>
        <ul style="margin: 8px 0 0 0; color: #92400e;">
            <li>Verify AI cost calculations for accuracy</li>
            <li>Review uploaded files for quality and requirements</li>
            <li>Confirm logo customization recommendations</li>
            <li>Follow up with customer if additional info needed</li>
            <li>Convert to order when customer is ready</li>
        </ul>
    </div>
    
    <a href="/dashboard/admin/quotes" class="button">View in Admin Dashboard</a>
    
    <p>This AI-generated quote has been automatically processed and is ready for your review.</p>
  `;

  return emailBaseTemplate(content, 'New AI Quote - Review Required');
};

// Message notification email template
export const messageNotificationTemplate = (message: any, conversationUrl: string) => {
  const content = `
    <h2>New Message</h2>
    <p>Hello ${message.recipientName || 'there'},</p>
    
    <p>You have a new message from <strong>${message.senderName}</strong>:</p>
    
    <div class="order-details">
        <p><strong>Category:</strong> ${message.category}</p>
        <p><strong>Priority:</strong> ${message.priority}</p>
        <p><strong>Message:</strong></p>
        <p style="font-style: italic; margin-left: 16px;">"${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}"</p>
    </div>
    
    <p>Click the button below to view the full message and reply:</p>
    
    <a href="${conversationUrl}" class="button">View Message</a>
    
    <p>Best regards,<br>The US Custom Cap Team</p>
  `;

  return emailBaseTemplate(content, 'New Message');
};

export const emailTemplates = {
  orderStatus: orderStatusTemplate,
  welcome: welcomeEmailTemplate,
  invoice: invoiceEmailTemplate,
  passwordReset: passwordResetTemplate,
  quoteReady: traditionalQuoteReceiptTemplate, // Backward compatibility
  traditionalQuoteReceipt: traditionalQuoteReceiptTemplate,
  aiQuoteReceipt: aiQuoteReceiptTemplate,
  adminTraditionalQuoteNotification: adminTraditionalQuoteNotificationTemplate,
  adminAIQuoteNotification: adminAIQuoteNotificationTemplate,
  messageNotification: messageNotificationTemplate
};