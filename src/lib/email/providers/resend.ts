import { Resend } from 'resend';
import { EmailProvider, InvoiceEmailPayload, QuoteEmailPayload, AdminQuoteNotificationPayload } from '../types';

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor(apiKey: string = process.env.RESEND_API_KEY!) {
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required for ResendProvider');
    }
    this.resend = new Resend(apiKey);
  }

  async sendInvoiceEmail(payload: InvoiceEmailPayload): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'US Custom Cap <noreply@uscustomcap.com>',
        to: [payload.to],
        subject: `Invoice ${payload.invoiceNumber || payload.invoiceId} - US Custom Cap`,
        html: this.generateInvoiceEmailHtml(payload),
        text: this.generateInvoiceEmailText(payload)
      });

      if (error) {
        console.error('Failed to send invoice email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      console.log('Invoice email sent successfully:', data);
    } catch (error) {
      console.error('Error sending invoice email:', error);
      throw error;
    }
  }

  async sendQuoteEmail(payload: QuoteEmailPayload): Promise<void> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: 'US Custom Cap <noreply@uscustomcap.com>',
        to: [payload.to],
        subject: `Your Quote is Ready - US Custom Cap (${payload.quoteNumber})`,
        html: this.generateQuoteEmailHtml(payload),
        text: this.generateQuoteEmailText(payload)
      });

      if (error) {
        console.error('Failed to send quote email:', error);
        throw new Error(`Failed to send quote email: ${error.message}`);
      }

      console.log('Quote email sent successfully:', data);
    } catch (error) {
      console.error('Error sending quote email:', error);
      throw error;
    }
  }

  async sendAdminQuoteNotification(payload: AdminQuoteNotificationPayload): Promise<void> {
    try {
      const isAcceptance = payload.quoteAcceptance || false;
      const subject = isAcceptance
        ? `✅ QUOTE ACCEPTED - Order Required - ${payload.customerName || 'Customer'} (${payload.quoteNumber})`
        : `New Quote Generated - ${payload.customerName || 'Customer'} (${payload.quoteNumber})`;

      const { data, error } = await this.resend.emails.send({
        from: 'US Custom Cap <noreply@uscustomcap.com>',
        to: [payload.to],
        subject: subject,
        html: this.generateAdminNotificationHtml(payload),
        text: this.generateAdminNotificationText(payload)
      });

      if (error) {
        console.error('Failed to send admin notification email:', error);
        throw new Error(`Failed to send admin notification: ${error.message}`);
      }

      console.log('Admin notification email sent successfully:', data);
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      throw error;
    }
  }

  private generateInvoiceEmailHtml(payload: InvoiceEmailPayload): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">US Custom Cap</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Custom Baseball Caps</p>
        </div>
        
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Your Invoice is Ready</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Hi${payload.customerName ? ` ${payload.customerName}` : ''},
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Your invoice <strong>${payload.invoiceNumber || payload.invoiceId}</strong> is now available for download.
            ${payload.total ? ` The total amount is <strong>$${payload.total}</strong>.` : ''}
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payload.downloadLink}" 
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Download Invoice PDF
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            If you have any questions about this invoice, please don't hesitate to contact us.
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            <p>This email was sent by US Custom Cap. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </div>
    `;
  }

  private generateInvoiceEmailText(payload: InvoiceEmailPayload): string {
    return `
US Custom Cap - Your Invoice is Ready

Hi${payload.customerName ? ` ${payload.customerName}` : ''},

Your invoice ${payload.invoiceNumber || payload.invoiceId} is now available for download.
${payload.total ? `The total amount is $${payload.total}.` : ''}

Download your invoice: ${payload.downloadLink}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
The US Custom Cap Team
    `.trim();
  }

  private generateQuoteEmailHtml(payload: QuoteEmailPayload): string {
    const formatCurrency = (amount: any) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
      if (isNaN(num) || num === null || num === undefined) return '$0.00';
      return `$${num.toFixed(2)}`;
    };

    const { quoteDetails } = payload;
    const costBreakdown = quoteDetails.estimatedCosts || {};
    const productSpecs = quoteDetails.productSpecs || {};
    const logoReqs = quoteDetails.logoRequirements || {};
    const orderBuilderData = quoteDetails.orderBuilderData || {};

    // DEBUG: Log the actual data structure to understand what we're working with
    console.log('🔍 EMAIL DEBUG - Quote Details Structure:', {
      hasQuoteDetails: !!quoteDetails,
      hasEstimatedCosts: !!quoteDetails.estimatedCosts,
      hasProductSpecs: !!quoteDetails.productSpecs,
      hasLogoRequirements: !!quoteDetails.logoRequirements,
      hasOrderBuilderData: !!quoteDetails.orderBuilderData,
      orderBuilderDataKeys: Object.keys(orderBuilderData),
      orderBuilderDataSample: orderBuilderData
    });

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Quote is Ready - US Custom Cap</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: bold;">US CUSTOM CAPS</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Custom Baseball Caps | Joseph Benise | +1 (678) 858-7893</p>
          </div>

          <!-- Quote Info Section -->
          <div style="padding: 30px; background: #ecfdf5; border-bottom: 3px solid #10b981;">
            <div style="text-align: center;">
              <h2 style="color: #065f46; margin: 0 0 10px 0; font-size: 24px;">Your Quote is Ready!</h2>
              <p style="color: #374151; font-size: 16px; margin: 5px 0;">Quote #${payload.quoteNumber}</p>
              ${payload.total ? `<p style="color: #059669; font-size: 20px; font-weight: bold; margin: 10px 0;">Total: ${formatCurrency(payload.total)}</p>` : ''}
            </div>
          </div>

          <!-- Customer Info -->
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Quote Details</h3>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0; color: #666;"><strong>Customer:</strong> ${payload.customerName || 'N/A'}</p>
              ${payload.customerCompany ? `<p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${payload.customerCompany}</p>` : ''}
              <p style="margin: 5px 0; color: #666;"><strong>Product:</strong> ${payload.productType || 'Custom Cap'}</p>
              ${payload.quantity ? `<p style="margin: 5px 0; color: #666;"><strong>Quantity:</strong> ${payload.quantity} pieces</p>` : ''}
            </div>
          </div>

          <!-- Product Specifications -->
          ${productSpecs && Object.keys(productSpecs).length > 0 ? `
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Product Specifications</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              ${productSpecs.profile ? `<div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 3px solid #3b82f6;"><strong style="color: #1e293b;">Profile:</strong><br><span style="color: #64748b;">${productSpecs.profile}</span></div>` : ''}
              ${productSpecs.fabric ? `<div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 3px solid #3b82f6;"><strong style="color: #1e293b;">Fabric:</strong><br><span style="color: #64748b;">${productSpecs.fabric}</span></div>` : ''}
              ${productSpecs.colors ? `<div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 3px solid #3b82f6;"><strong style="color: #1e293b;">Colors:</strong><br><span style="color: #64748b;">${productSpecs.colors}</span></div>` : ''}
              ${productSpecs.closure ? `<div style="background: #f1f5f9; padding: 15px; border-radius: 6px; border-left: 3px solid #3b82f6;"><strong style="color: #1e293b;">Closure:</strong><br><span style="color: #64748b;">${productSpecs.closure}</span></div>` : ''}
            </div>
          </div>
          ` : ''}

          <!-- Logo Requirements -->
          ${logoReqs.logos && logoReqs.logos.length > 0 ? `
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Logo Requirements</h3>
            <div style="display: grid; gap: 10px;">
              ${logoReqs.logos.map((logo: any) => `
                <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    <span><strong style="color: #92400e;">Location:</strong> ${logo.location || 'N/A'}</span>
                    <span><strong style="color: #92400e;">Type:</strong> ${logo.type || 'N/A'}</span>
                    <span><strong style="color: #92400e;">Size:</strong> ${logo.size || 'N/A'}</span>
                    <span><strong style="color: #92400e;">Cost:</strong> ${formatCurrency(logo.totalCost || logo.cost || 0)}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Order Builder Comprehensive Breakdown -->
          ${orderBuilderData && (orderBuilderData.pricing || orderBuilderData.capDetails || orderBuilderData.customization) ? `
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb; background: #f8fafc;">
            <h3 style="color: #065f46; margin: 0 0 20px 0; font-size: 20px; text-align: center;">📋 Order Builder - Comprehensive Quote Breakdown</h3>

            <!-- Cap Style Setup -->
            ${orderBuilderData.capDetails ? `
            <div style="margin-bottom: 25px; background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
              <h4 style="color: #065f46; margin: 0 0 15px 0; font-size: 16px;">🧢 Cap Style Setup</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
                ${orderBuilderData.capDetails.productName ? `<span><strong>Product:</strong> ${orderBuilderData.capDetails.productName}</span>` : ''}
                ${orderBuilderData.capDetails.quantity ? `<span><strong>Quantity:</strong> ${orderBuilderData.capDetails.quantity} pieces</span>` : ''}
                ${orderBuilderData.capDetails.color ? `<span><strong>Color:</strong> ${orderBuilderData.capDetails.color}</span>` : ''}
                ${orderBuilderData.capDetails.size ? `<span><strong>Size:</strong> ${orderBuilderData.capDetails.size}</span>` : ''}
                ${orderBuilderData.capDetails.profile ? `<span><strong>Profile:</strong> ${orderBuilderData.capDetails.profile}</span>` : ''}
                ${orderBuilderData.capDetails.shape ? `<span><strong>Shape:</strong> ${orderBuilderData.capDetails.shape}</span>` : ''}
                ${orderBuilderData.capDetails.structure ? `<span><strong>Structure:</strong> ${orderBuilderData.capDetails.structure}</span>` : ''}
                ${orderBuilderData.capDetails.fabric ? `<span><strong>Fabric:</strong> ${orderBuilderData.capDetails.fabric}</span>` : ''}
                ${orderBuilderData.capDetails.closure ? `<span><strong>Closure:</strong> ${orderBuilderData.capDetails.closure}</span>` : ''}
                ${orderBuilderData.capDetails.stitching ? `<span><strong>Stitching:</strong> ${orderBuilderData.capDetails.stitching}</span>` : ''}
              </div>
              ${orderBuilderData.pricing?.baseProductCost ? `
              <div style="margin-top: 15px; padding: 10px; background: #ecfdf5; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between;">
                  <span><strong>Unit Price:</strong> ${formatCurrency(orderBuilderData.pricing.baseProductCost / (orderBuilderData.capDetails.quantity || 1))}</span>
                  <span><strong>Subtotal:</strong> ${formatCurrency(orderBuilderData.pricing.baseProductCost)}</span>
                </div>
              </div>
              ` : ''}

              <!-- Premium Costs Section -->
              ${(orderBuilderData.pricing?.premiumFabricCost || orderBuilderData.pricing?.premiumClosureCost ||
                orderBuilderData.pricing?.fabricDetails) ? `
              <div style="margin-top: 15px; padding: 15px; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
                <h5 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">⭐ Premium Upgrades:</h5>
                <div style="font-size: 13px; line-height: 1.5;">
                  ${orderBuilderData.pricing.fabricDetails ? Object.entries(orderBuilderData.pricing.fabricDetails).map(([fabric, cost]: [string, any]) => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>${fabric}: <strong>${formatCurrency(cost / (orderBuilderData.capDetails?.quantity || 1))}/cap</strong></span>
                      <span><strong>${formatCurrency(cost)}</strong></span>
                    </div>
                  `).join('') : ''}
                  ${orderBuilderData.pricing.premiumFabricCost && !orderBuilderData.pricing.fabricDetails ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>Premium Fabric: <strong>${formatCurrency(orderBuilderData.pricing.premiumFabricCost / (orderBuilderData.capDetails?.quantity || 1))}/cap</strong></span>
                      <span><strong>${formatCurrency(orderBuilderData.pricing.premiumFabricCost)}</strong></span>
                    </div>
                  ` : ''}
                  ${orderBuilderData.pricing.premiumClosureCost ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>Premium Closure: <strong>${formatCurrency(orderBuilderData.pricing.premiumClosureCost / (orderBuilderData.capDetails?.quantity || 1))}/cap</strong></span>
                      <span><strong>${formatCurrency(orderBuilderData.pricing.premiumClosureCost)}</strong></span>
                    </div>
                  ` : ''}
                </div>
              </div>
              ` : ''}
            </div>
            ` : ''}

            <!-- Customization Details -->
            ${orderBuilderData.customization ? `
            <div style="margin-bottom: 25px; background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h4 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px;">🎨 Customization</h4>

              <!-- Logo Setup - Show either detailed logos or cost summary -->
              ${(orderBuilderData.customization.logos && orderBuilderData.customization.logos.length > 0) ||
                (orderBuilderData.customization.logoDetails && orderBuilderData.customization.logoDetails.length > 0) ? `
              <div style="margin-bottom: 15px;">
                <h5 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">🎨 Logo Setup:</h5>
                ${(orderBuilderData.customization.logos || orderBuilderData.customization.logoDetails || []).map((logo: any, index: number) => `
                  <div style="background: #fef3c7; padding: 12px; margin-bottom: 8px; border-radius: 6px; font-size: 13px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                      <span><strong>Position:</strong> ${logo.location || logo.position || `Logo ${index + 1}`}</span>
                      <span><strong>Method:</strong> ${logo.type || logo.method || 'Unknown'}</span>
                      <span><strong>Size:</strong> ${logo.size || 'Unknown'}</span>
                      <span><strong>Unit Cost:</strong> ${formatCurrency(logo.unitCost || 0)}/cap</span>
                      <span><strong>Setup Fee:</strong> ${formatCurrency(logo.moldCharge || logo.setupCost || 0)}</span>
                      <span><strong>Total Cost:</strong> ${formatCurrency((logo.unitCost || 0) * (orderBuilderData.capDetails?.quantity || 1) + (logo.moldCharge || logo.setupCost || 0))}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
              ` : orderBuilderData.pricing?.logosCost ? `
              <!-- Logo Cost Summary (when detailed logos not available) -->
              <div style="margin-bottom: 15px;">
                <h5 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">🎨 Logo Setup:</h5>
                <div style="background: #fef3c7; padding: 12px; border-radius: 6px; font-size: 13px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Total Logo Costs:</span>
                    <span><strong>${formatCurrency(orderBuilderData.pricing.logosCost)}</strong></span>
                  </div>
                  ${orderBuilderData.pricing.moldCharges ? `
                  <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span>Setup/Mold Charges:</span>
                    <span><strong>${formatCurrency(orderBuilderData.pricing.moldCharges)}</strong></span>
                  </div>
                  ` : ''}
                </div>
              </div>
              ` : ''}

              <!-- Accessories - Show either detailed accessories or cost summary -->
              ${(orderBuilderData.customization.accessories && orderBuilderData.customization.accessories.length > 0) ||
                (orderBuilderData.pricing?.accessoryDetails) ? `
              <div style="margin-bottom: 15px;">
                <h5 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">🏷️ Accessories:</h5>
                <div style="background: #fef3c7; padding: 12px; border-radius: 6px; font-size: 13px;">
                  ${orderBuilderData.pricing?.accessoryDetails ? Object.entries(orderBuilderData.pricing.accessoryDetails).map(([accessory, cost]: [string, any]) => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>${accessory}: <strong>${formatCurrency(cost / (orderBuilderData.capDetails?.quantity || 1))}/cap</strong></span>
                      <span><strong>${formatCurrency(cost)}</strong></span>
                    </div>
                  `).join('') : ''}
                  ${orderBuilderData.customization.accessories ? orderBuilderData.customization.accessories.map((acc: any) => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                      <span>${acc.name || 'Accessory'}: <strong>${formatCurrency((acc.cost || 0) / (orderBuilderData.capDetails?.quantity || 1))}/cap</strong></span>
                      <span><strong>${formatCurrency(acc.cost || 0)}</strong></span>
                    </div>
                  `).join('') : ''}
                </div>
              </div>
              ` : orderBuilderData.pricing?.accessoriesCost ? `
              <!-- Accessories Cost Summary (when detailed accessories not available) -->
              <div style="margin-bottom: 15px;">
                <h5 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">🏷️ Accessories:</h5>
                <div style="background: #fef3c7; padding: 12px; border-radius: 6px; font-size: 13px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Total Accessories Cost:</span>
                    <span><strong>${formatCurrency(orderBuilderData.pricing.accessoriesCost)}</strong></span>
                  </div>
                </div>
              </div>
              ` : ''}

              ${orderBuilderData.pricing ? `
              <div style="padding: 10px; background: #fef3c7; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                  <span>Total Customization Cost:</span>
                  <span>${formatCurrency((orderBuilderData.pricing.logosCost || 0) + (orderBuilderData.pricing.moldCharges || 0) + (orderBuilderData.pricing.accessoriesCost || 0))}</span>
                </div>
              </div>
              ` : ''}
            </div>
            ` : ''}

            <!-- Delivery Information -->
            ${orderBuilderData.delivery ? `
            <div style="margin-bottom: 25px; background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px;">🚚 Delivery</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
                ${orderBuilderData.delivery.method ? `<span><strong>Method:</strong> ${orderBuilderData.delivery.method}</span>` : ''}
                ${orderBuilderData.delivery.leadTime || orderBuilderData.delivery.timeframe ? `<span><strong>Lead Time:</strong> ${orderBuilderData.delivery.leadTime || orderBuilderData.delivery.timeframe}</span>` : ''}
                ${orderBuilderData.delivery.urgency ? `<span><strong>Urgency:</strong> ${orderBuilderData.delivery.urgency}</span>` : ''}
                ${orderBuilderData.delivery.address ? `<span><strong>Address:</strong> Provided</span>` : ''}
              </div>
              ${orderBuilderData.pricing?.deliveryCost ? `
              <div style="margin-top: 15px; padding: 10px; background: #dbeafe; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between;">
                  <span><strong>Delivery Cost:</strong></span>
                  <span><strong>${formatCurrency(orderBuilderData.pricing.deliveryCost)}</strong></span>
                </div>
              </div>
              ` : ''}
            </div>
            ` : ''}

            <!-- Final Cost Summary -->
            ${orderBuilderData.pricing ? `
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; border: 2px solid #10b981;">
              <h4 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px; text-align: center;">💰 Cost Breakdown</h4>
              <div style="font-size: 15px;">
                ${orderBuilderData.pricing.baseProductCost ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                  <span>Caps (${orderBuilderData.capDetails?.quantity || 1} × ${formatCurrency(orderBuilderData.pricing.baseProductCost / (orderBuilderData.capDetails?.quantity || 1))}):</span>
                  <span style="font-weight: bold;">${formatCurrency(orderBuilderData.pricing.baseProductCost)}</span>
                </div>
                ` : ''}
                ${orderBuilderData.pricing.logosCost ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                  <span>Logos:</span>
                  <span style="font-weight: bold;">${formatCurrency(orderBuilderData.pricing.logosCost)}</span>
                </div>
                ` : ''}
                ${orderBuilderData.pricing.moldCharges ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                  <span>Setup/Mold Charges:</span>
                  <span style="font-weight: bold;">${formatCurrency(orderBuilderData.pricing.moldCharges)}</span>
                </div>
                ` : ''}
                ${orderBuilderData.pricing.accessoriesCost ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                  <span>Accessories:</span>
                  <span style="font-weight: bold;">${formatCurrency(orderBuilderData.pricing.accessoriesCost)}</span>
                </div>
                ` : ''}
                ${orderBuilderData.pricing.premiumFabricCost ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                  <span>Premium Fabric (${formatCurrency(orderBuilderData.pricing.premiumFabricCost / (payload.quantity || 1))}/cap):</span>
                  <span style="font-weight: bold;">${formatCurrency(orderBuilderData.pricing.premiumFabricCost)}</span>
                </div>
                ` : ''}
                ${orderBuilderData.pricing.premiumClosureCost ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                  <span>Premium Closure (${formatCurrency(orderBuilderData.pricing.premiumClosureCost / (payload.quantity || 1))}/cap):</span>
                  <span style="font-weight: bold;">${formatCurrency(orderBuilderData.pricing.premiumClosureCost)}</span>
                </div>
                ` : ''}
                ${orderBuilderData.pricing.deliveryCost ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                  <span>Delivery (${formatCurrency(orderBuilderData.pricing.deliveryCost / (payload.quantity || 1))}/cap):</span>
                  <span style="font-weight: bold;">${formatCurrency(orderBuilderData.pricing.deliveryCost)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-top: 15px; padding: 15px 0; border-top: 3px solid #10b981; font-size: 18px;">
                  <span style="font-weight: bold; color: #065f46;">Total Cost:</span>
                  <span style="font-weight: bold; color: #059669; font-size: 20px;">${formatCurrency(orderBuilderData.pricing.total || payload.total)}</span>
                </div>
                ${payload.quantity ? `
                <div style="text-align: center; margin-top: 10px; color: #065f46;">
                  <strong>${formatCurrency((orderBuilderData.pricing.total || payload.total) / payload.quantity)}/cap</strong>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <!-- Cost Breakdown -->
          ${costBreakdown && Object.keys(costBreakdown).length > 0 ? `
          <div style="padding: 30px; background: #ecfdf5; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 20px 0; font-size: 20px; text-align: center;">Cost Breakdown</h3>

            ${costBreakdown.baseProductCost ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
              <span style="color: #374151;">Base Product Cost:</span>
              <span style="color: #059669; font-weight: bold;">${formatCurrency(costBreakdown.baseProductCost)}</span>
            </div>
            ` : ''}

            ${costBreakdown.logosCost ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
              <span style="color: #374151;">Logos Cost:</span>
              <span style="color: #059669; font-weight: bold;">${formatCurrency(costBreakdown.logosCost)}</span>
            </div>
            ` : ''}

            ${costBreakdown.moldCharges ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
              <span style="color: #374151;">Mold Charges:</span>
              <span style="color: #059669; font-weight: bold;">${formatCurrency(costBreakdown.moldCharges)}</span>
            </div>
            ` : ''}

            ${costBreakdown.accessoriesCost ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
              <span style="color: #374151;">Accessories:</span>
              <span style="color: #059669; font-weight: bold;">${formatCurrency(costBreakdown.accessoriesCost)}</span>
            </div>
            ` : ''}

            ${costBreakdown.deliveryCost ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
              <span style="color: #374151;">Delivery:</span>
              <span style="color: #059669; font-weight: bold;">${formatCurrency(costBreakdown.deliveryCost)}</span>
            </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between; margin-top: 20px; padding: 15px 0; border-top: 3px solid #10b981;">
              <span style="color: #065f46; font-size: 18px; font-weight: bold;">Total Cost:</span>
              <span style="color: #059669; font-size: 18px; font-weight: bold;">${formatCurrency(costBreakdown.total || payload.total)}</span>
            </div>
          </div>
          ` : ''}

          <!-- Download PDF Section -->
          <div style="padding: 40px 30px; text-align: center; background: #f8fafc;">
            <h3 style="color: #333; margin: 0 0 20px 0;">Download Your Detailed Quote</h3>
            <a href="${payload.pdfDownloadLink}"
               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              📄 Download Quote PDF
            </a>
            <p style="color: #666; margin: 20px 0 0 0; font-size: 14px;">
              Your detailed quote includes all specifications, cost breakdowns, and terms.
            </p>
          </div>

          <!-- Next Steps -->
          <div style="padding: 30px; background: white; border-bottom: 1px solid #e5e7eb;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Next Steps</h3>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <ul style="margin: 0; padding-left: 20px; color: #64748b; line-height: 1.6;">
                <li>Review your detailed quote PDF</li>
                <li>This quote is valid for 30 days</li>
                <li>Contact us with any questions or to proceed</li>
                <li>50% deposit required to begin production</li>
                <li>Production time: 10-15 business days after approval</li>
              </ul>
            </div>
          </div>

          <!-- Contact Information -->
          <div style="padding: 30px; background: #374151; color: white; text-align: center;">
            <h3 style="color: white; margin: 0 0 15px 0;">Questions? We're Here to Help!</h3>
            <p style="margin: 10px 0; color: #d1d5db;">
              <strong>Joseph Benise</strong><br>
              📞 +1 (678) 858-7893<br>
              📧 Contact us for any questions<br>
              📍 957 Hwy 85 Connector, Brooks, GA 30205
            </p>
          </div>

          <!-- Footer -->
          <div style="padding: 20px; background: #111827; color: #9ca3af; text-align: center; font-size: 12px;">
            <p style="margin: 0;">
              US Custom Caps | Quote #${payload.quoteNumber} | This email was sent regarding your custom cap quote request.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateQuoteEmailText(payload: QuoteEmailPayload): string {
    const formatCurrency = (amount: any) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
      if (isNaN(num) || num === null || num === undefined) return '$0.00';
      return `$${num.toFixed(2)}`;
    };

    const { quoteDetails } = payload;
    const costBreakdown = quoteDetails.estimatedCosts || {};

    return `
US CUSTOM CAPS - Your Quote is Ready!

Hi${payload.customerName ? ` ${payload.customerName}` : ''},

Great news! Your custom cap quote is ready for review.

QUOTE DETAILS
=============
Quote Number: ${payload.quoteNumber}
${payload.total ? `Total Amount: ${formatCurrency(payload.total)}` : ''}
${payload.quantity ? `Quantity: ${payload.quantity} pieces` : ''}
Product: ${payload.productType || 'Custom Cap'}
${payload.customerCompany ? `Company: ${payload.customerCompany}` : ''}

${costBreakdown && Object.keys(costBreakdown).length > 0 ? `
COST BREAKDOWN
==============
${costBreakdown.baseProductCost ? `Base Product Cost: ${formatCurrency(costBreakdown.baseProductCost)}` : ''}
${costBreakdown.logosCost ? `Logos Cost: ${formatCurrency(costBreakdown.logosCost)}` : ''}
${costBreakdown.moldCharges ? `Mold Charges: ${formatCurrency(costBreakdown.moldCharges)}` : ''}
${costBreakdown.accessoriesCost ? `Accessories: ${formatCurrency(costBreakdown.accessoriesCost)}` : ''}
${costBreakdown.deliveryCost ? `Delivery: ${formatCurrency(costBreakdown.deliveryCost)}` : ''}
------------------------
Total: ${formatCurrency(costBreakdown.total || payload.total)}
` : ''}

DOWNLOAD YOUR QUOTE
===================
View and download your detailed quote: ${payload.pdfDownloadLink}

Your detailed PDF includes:
• Complete product specifications
• Logo requirements and costs
• Terms and conditions
• Production timeline

NEXT STEPS
==========
• This quote is valid for 30 days
• 50% deposit required to begin production
• Production time: 10-15 business days after approval
• Questions? Contact us anytime!

CONTACT INFORMATION
==================
Joseph Benise
Phone: +1 (678) 858-7893
Address: 957 Hwy 85 Connector, Brooks, GA 30205

Thank you for choosing US Custom Caps for your custom baseball cap needs!

Best regards,
The US Custom Cap Team

---
Quote #${payload.quoteNumber} | US Custom Caps
    `.trim();
  }

  private generateAdminNotificationHtml(payload: AdminQuoteNotificationPayload): string {
    const formatCurrency = (amount: any) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
      if (isNaN(num) || num === null || num === undefined) return '$0.00';
      return `$${num.toFixed(2)}`;
    };

    const isAcceptance = payload.quoteAcceptance || false;
    const orderBuilderData = payload.orderBuilderData || {};

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Quote Generated - Admin Notification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background: white;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, ${isAcceptance ? '#10b981 0%, #059669 100%' : '#3b82f6 0%, #1d4ed8 100%'}); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">${isAcceptance ? '✅ QUOTE ACCEPTED!' : '🚨 NEW QUOTE ALERT'}</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">US Custom Caps Admin Dashboard</p>
          </div>

          <!-- Alert Info -->
          <div style="padding: 30px; background: ${isAcceptance ? '#ecfdf5' : '#dbeafe'}; border-bottom: 3px solid ${isAcceptance ? '#10b981' : '#3b82f6'};">
            <div style="text-align: center;">
              <h2 style="color: ${isAcceptance ? '#065f46' : '#1e40af'}; margin: 0 0 10px 0; font-size: 22px;">${isAcceptance ? 'Quote Accepted - Order Conversion!' : 'New Quote Generated!'}</h2>
              <p style="color: #374151; font-size: 16px; margin: 5px 0;">Quote #${payload.quoteNumber}</p>
              ${payload.total ? `<p style="color: ${isAcceptance ? '#059669' : '#1d4ed8'}; font-size: 20px; font-weight: bold; margin: 10px 0;">Value: ${formatCurrency(payload.total)}</p>` : ''}
              ${isAcceptance ? `<p style="color: #059669; font-size: 14px; font-weight: bold; margin: 10px 0;">🎉 Customer has accepted this quote! Order conversion required.</p>` : ''}
            </div>
          </div>

          <!-- Customer Details -->
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Customer Information</h3>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${payload.customerName || 'N/A'}</p>
              <p style="margin: 5px 0; color: #666;"><strong>Email:</strong> ${payload.customerEmail || 'N/A'}</p>
              ${payload.customerCompany ? `<p style="margin: 5px 0; color: #666;"><strong>Company:</strong> ${payload.customerCompany}</p>` : ''}
              <p style="margin: 5px 0; color: #666;"><strong>Product:</strong> ${payload.productType || 'Custom Cap'}</p>
              ${payload.quantity ? `<p style="margin: 5px 0; color: #666;"><strong>Quantity:</strong> ${payload.quantity} pieces</p>` : ''}
            </div>
          </div>

          <!-- Quote Summary -->
          <div style="padding: 30px; background: #ecfdf5; border-left: 4px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 20px 0; font-size: 18px;">Quote Summary</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #d1fae5;">
              <span style="color: #374151; font-weight: bold;">Quote Number:</span>
              <span style="color: #059669; font-weight: bold;">${payload.quoteNumber}</span>
            </div>
            ${payload.total ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px 0; border-bottom: 1px solid #d1fae5;">
              <span style="color: #374151; font-weight: bold;">Total Value:</span>
              <span style="color: #059669; font-weight: bold; font-size: 18px;">${formatCurrency(payload.total)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 10px 0;">
              <span style="color: #374151; font-weight: bold;">Status:</span>
              <span style="color: #059669; font-weight: bold;">${isAcceptance ? 'ACCEPTED - Order Creation Required' : 'Ready for Review'}</span>
            </div>
          </div>

          <!-- Admin Order Builder Breakdown -->
          ${orderBuilderData && Object.keys(orderBuilderData).length > 0 ? `
          <div style="padding: 30px; border-bottom: 1px solid #e5e7eb; background: #f8fafc;">
            <h3 style="color: #065f46; margin: 0 0 20px 0; font-size: 18px; text-align: center;">📋 Admin Dashboard - Complete Order Details</h3>

            <!-- Admin Cap Specifications -->
            ${orderBuilderData.capDetails ? `
            <div style="margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 14px;">Cap Specifications:</h4>
              <div style="font-size: 13px; line-height: 1.4;">
                <strong>Product:</strong> ${orderBuilderData.capDetails.productName || 'N/A'} |
                <strong>Qty:</strong> ${orderBuilderData.capDetails.quantity || 1} |
                <strong>Color:</strong> ${orderBuilderData.capDetails.color || 'N/A'} |
                <strong>Profile:</strong> ${orderBuilderData.capDetails.profile || 'N/A'} |
                <strong>Fabric:</strong> ${orderBuilderData.capDetails.fabric || 'N/A'} |
                <strong>Closure:</strong> ${orderBuilderData.capDetails.closure || 'N/A'}
              </div>
            </div>
            ` : ''}

            <!-- Admin Logo Requirements -->
            ${orderBuilderData.customization?.logos && orderBuilderData.customization.logos.length > 0 ? `
            <div style="margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">Logo Requirements (${orderBuilderData.customization.logos.length} logos):</h4>
              ${orderBuilderData.customization.logos.map((logo: any, index: number) => `
                <div style="background: #fef3c7; padding: 8px; margin-bottom: 6px; border-radius: 4px; font-size: 12px;">
                  <strong>Logo ${index + 1}:</strong> ${logo.location || 'Unknown'} - ${logo.type || 'Unknown'} (${logo.size || 'N/A'}) - Setup: ${formatCurrency(logo.moldCharge || logo.setupCost || 0)} - Unit: ${formatCurrency(logo.unitCost || 0)}
                </div>
              `).join('')}
            </div>
            ` : ''}

            <!-- Admin Cost Summary -->
            ${orderBuilderData.pricing ? `
            <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; border: 2px solid #10b981;">
              <h4 style="color: #065f46; margin: 0 0 10px 0; font-size: 14px;">Admin Cost Summary:</h4>
              <div style="font-size: 13px;">
                ${orderBuilderData.pricing.baseProductCost ? `<div style="display: flex; justify-content: space-between;"><span>Base Caps:</span><span>${formatCurrency(orderBuilderData.pricing.baseProductCost)}</span></div>` : ''}
                ${orderBuilderData.pricing.logosCost ? `<div style="display: flex; justify-content: space-between;"><span>Logos:</span><span>${formatCurrency(orderBuilderData.pricing.logosCost)}</span></div>` : ''}
                ${orderBuilderData.pricing.moldCharges ? `<div style="display: flex; justify-content: space-between;"><span>Setup Fees:</span><span>${formatCurrency(orderBuilderData.pricing.moldCharges)}</span></div>` : ''}
                ${orderBuilderData.pricing.accessoriesCost ? `<div style="display: flex; justify-content: space-between;"><span>Accessories:</span><span>${formatCurrency(orderBuilderData.pricing.accessoriesCost)}</span></div>` : ''}
                ${orderBuilderData.pricing.deliveryCost ? `<div style="display: flex; justify-content: space-between;"><span>Delivery:</span><span>${formatCurrency(orderBuilderData.pricing.deliveryCost)}</span></div>` : ''}
                <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 2px solid #10b981; font-weight: bold;">
                  <span>TOTAL:</span><span>${formatCurrency(orderBuilderData.pricing.total || payload.total)}</span>
                </div>
                ${payload.quantity ? `<div style="text-align: center; margin-top: 5px; font-size: 12px;">($${formatCurrency((orderBuilderData.pricing.total || payload.total) / payload.quantity)}/cap)</div>` : ''}
              </div>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <!-- Action Buttons -->
          <div style="padding: 40px 30px; text-align: center; background: #f8fafc;">
            <h3 style="color: #333; margin: 0 0 20px 0;">Take Action</h3>
            <div style="margin-bottom: 20px;">
              <a href="${payload.dashboardLink}"
                 style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 5px; font-size: 16px;">
                🏪 View in Dashboard
              </a>
            </div>
            <div>
              <a href="${payload.pdfDownloadLink}"
                 style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin: 5px;">
                📄 Download PDF
              </a>
            </div>
          </div>

          <!-- Priority Notice -->
          <div style="padding: 20px 30px; background: ${isAcceptance ? '#dcfce7' : '#fef3c7'}; border-left: 4px solid ${isAcceptance ? '#16a34a' : '#f59e0b'};">
            <p style="margin: 0; color: ${isAcceptance ? '#14532d' : '#92400e'}; font-weight: bold;">${isAcceptance ? '🚀 IMMEDIATE ACTION REQUIRED' : '⚡ Action Required'}</p>
            <p style="margin: 5px 0 0 0; color: ${isAcceptance ? '#14532d' : '#92400e'}; font-size: 14px;">
              ${isAcceptance
                ? 'Customer has accepted this quote! Please create the order in your system and begin production planning. Contact customer for payment and production timeline.'
                : 'This quote was generated via AI and is awaiting your review. Please verify all details and respond to the customer promptly.'}
            </p>
          </div>

          <!-- Footer -->
          <div style="padding: 20px; background: #111827; color: #9ca3af; text-align: center; font-size: 12px;">
            <p style="margin: 0;">
              US Custom Caps Admin System | Quote #${payload.quoteNumber} | Generated ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateAdminNotificationText(payload: AdminQuoteNotificationPayload): string {
    const formatCurrency = (amount: any) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
      if (isNaN(num) || num === null || num === undefined) return '$0.00';
      return `$${num.toFixed(2)}`;
    };

    return `
🚨 NEW QUOTE ALERT - US Custom Caps

QUOTE NOTIFICATION
==================
A new quote has been generated and is ready for your review.

Quote Number: ${payload.quoteNumber}
${payload.total ? `Total Value: ${formatCurrency(payload.total)}` : ''}
Status: Ready for Review

CUSTOMER INFORMATION
===================
Name: ${payload.customerName || 'N/A'}
Email: ${payload.customerEmail || 'N/A'}
${payload.customerCompany ? `Company: ${payload.customerCompany}` : ''}
Product: ${payload.productType || 'Custom Cap'}
${payload.quantity ? `Quantity: ${payload.quantity} pieces` : ''}

QUICK ACTIONS
=============
• View in Dashboard: ${payload.dashboardLink}
• Download PDF: ${payload.pdfDownloadLink}

⚡ ACTION REQUIRED
This quote was generated via AI and needs your review. Please verify all details and respond to the customer promptly.

Generated: ${new Date().toLocaleString()}
Quote ID: ${payload.quoteNumber}

---
US Custom Caps Admin System
    `.trim();
  }
}