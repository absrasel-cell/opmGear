/**
 * SUPPORT PAGE AI API ROUTE - COMPLETELY SEPARATE SYSTEM
 *
 * Uses step-by-step pricing with AI verification
 * Zero dependencies on Advanced Product Page systems
 * Custom Cap 101.txt knowledge base integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { supportAIPricing, SupportOrderBuilder } from '@/lib/support-ai/step-by-step-pricing';

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 [SUPPORT AI] New pricing request received');

    const { message, quantity = 144 } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Execute step-by-step pricing workflow
    const orderBuilder: SupportOrderBuilder = await supportAIPricing.processCompleteOrder(
      message,
      quantity
    );

    // Generate AI response using custom cap 101.txt knowledge
    const aiResponse = await generateAIResponse(message, orderBuilder);

    // Format response for support page
    const response = {
      success: true,
      message: aiResponse.message,
      orderBuilder: {
        capStyle: {
          completed: orderBuilder.capStyle.completed,
          status: getBlockStatus(orderBuilder.capStyle),
          data: orderBuilder.capStyle.data,
          cost: orderBuilder.capStyle.cost
        },
        customization: {
          completed: orderBuilder.logoSetup.completed || orderBuilder.premiumUpgrades.completed,
          status: getCustomizationStatus(orderBuilder.logoSetup, orderBuilder.premiumUpgrades),
          logoSetup: orderBuilder.logoSetup.data,
          premiumUpgrades: orderBuilder.premiumUpgrades.data,
          cost: orderBuilder.logoSetup.cost + orderBuilder.premiumUpgrades.cost
        },
        accessories: {
          completed: orderBuilder.accessories.completed,
          status: getBlockStatus(orderBuilder.accessories),
          data: orderBuilder.accessories.data,
          cost: orderBuilder.accessories.cost
        },
        delivery: {
          completed: orderBuilder.delivery.completed,
          status: getBlockStatus(orderBuilder.delivery),
          data: orderBuilder.delivery.data,
          cost: orderBuilder.delivery.cost
        },
        costBreakdown: {
          available: orderBuilder.allStepsCompleted,
          totalCost: orderBuilder.totalCost,
          breakdown: {
            capStyle: orderBuilder.capStyle.cost,
            customization: orderBuilder.logoSetup.cost + orderBuilder.premiumUpgrades.cost,
            accessories: orderBuilder.accessories.cost,
            delivery: orderBuilder.delivery.cost
          }
        }
      },
      errors: getAllErrors(orderBuilder),
      stepProgress: {
        step1: orderBuilder.capStyle.verification,
        step2: orderBuilder.premiumUpgrades.verification,
        step3: orderBuilder.logoSetup.verification,
        step4: orderBuilder.accessories.verification,
        step5: orderBuilder.delivery.verification
      }
    };

    console.log('✅ [SUPPORT AI] Order Builder response generated', {
      totalCost: orderBuilder.totalCost,
      allStepsCompleted: orderBuilder.allStepsCompleted,
      completedSteps: [
        orderBuilder.capStyle.completed,
        orderBuilder.premiumUpgrades.completed,
        orderBuilder.logoSetup.completed,
        orderBuilder.accessories.completed,
        orderBuilder.delivery.completed
      ].filter(Boolean).length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [SUPPORT AI] Processing failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'AI processing failed',
        message: 'I encountered an issue processing your request. Please try rephrasing your message or contact support.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// AI Response Generation using Custom Cap 101.txt Knowledge
async function generateAIResponse(message: string, orderBuilder: SupportOrderBuilder): Promise<{ message: string }> {

  const quantity = orderBuilder.capStyle.data?.quantity || 144;
  const productName = orderBuilder.capStyle.data?.productName || 'Custom Cap';
  const totalCost = orderBuilder.totalCost;

  // Generate contextual response based on analysis
  let response = `Based on your message: "${message}"\n\n`;

  response += `I've analyzed your requirements and created a quote for ${quantity} ${productName}s:\n\n`;

  // Step-by-step breakdown
  if (orderBuilder.capStyle.completed) {
    response += `**Cap Style Setup** ✅\n`;
    response += `• ${orderBuilder.capStyle.data.productName} (${orderBuilder.capStyle.data.priceTier})\n`;
    response += `• Base cost: $${orderBuilder.capStyle.cost.toFixed(2)}\n\n`;
  }

  if (orderBuilder.premiumUpgrades.completed) {
    response += `**Premium Upgrades** ✅\n`;
    if (orderBuilder.premiumUpgrades.data.fabric) {
      response += `• Fabric: ${orderBuilder.premiumUpgrades.data.fabric.type} (+$${orderBuilder.premiumUpgrades.data.fabric.cost.toFixed(2)})\n`;
    }
    if (orderBuilder.premiumUpgrades.data.closure) {
      response += `• Closure: ${orderBuilder.premiumUpgrades.data.closure.type} (+$${orderBuilder.premiumUpgrades.data.closure.cost.toFixed(2)})\n`;
    }
    response += `\n`;
  }

  if (orderBuilder.logoSetup.completed) {
    response += `**Logo Setup** ✅\n`;
    Object.entries(orderBuilder.logoSetup.data).forEach(([position, logo]: [string, any]) => {
      if (logo && logo.type) {
        response += `• ${position}: ${logo.type} (${logo.size}) - $${logo.cost.toFixed(2)}\n`;
      }
    });
    response += `\n`;
  }

  if (orderBuilder.accessories.completed) {
    response += `**Accessories** ✅\n`;
    Object.entries(orderBuilder.accessories.data).forEach(([name, accessory]: [string, any]) => {
      if (accessory && accessory.cost) {
        response += `• ${name}: $${accessory.cost.toFixed(2)}\n`;
      }
    });
    response += `\n`;
  }

  if (orderBuilder.delivery.completed) {
    response += `**Delivery** ✅\n`;
    response += `• Method: ${orderBuilder.delivery.data.method}\n`;
    response += `• Timeline: ${orderBuilder.delivery.data.days}\n`;
    response += `• Cost: $${orderBuilder.delivery.cost.toFixed(2)}\n\n`;
  }

  response += `**Total Investment: $${totalCost.toFixed(2)} for ${quantity} caps**\n`;
  response += `**Per Cap Cost: $${(totalCost / quantity).toFixed(2)}**\n\n`;

  // Add recommendations based on Custom Cap 101.txt knowledge
  if (quantity < 576) {
    response += `💡 *Volume Discount Opportunity*: Increase to 576+ caps for better per-unit pricing!\n\n`;
  }

  if (quantity >= 3168) {
    response += `🚢 *Large Order Benefits*: Your quantity qualifies for freight shipping discounts!\n\n`;
  }

  response += `Would you like to:\n`;
  response += `• Modify any specifications\n`;
  response += `• Add more customization options\n`;
  response += `• Proceed with this quote\n`;
  response += `• Get a physical sample\n\n`;

  response += `I'm here to help optimize your order! 🎯`;

  return { message: response };
}

// Helper functions for Order Builder status
function getBlockStatus(step: any): 'red' | 'yellow' | 'green' | 'empty' {
  if (!step.completed) return 'red';
  if (step.verification === 'error') return 'red';
  if (step.verification === 'pending') return 'yellow';
  return 'green';
}

function getCustomizationStatus(logoStep: any, upgradeStep: any): 'red' | 'yellow' | 'green' | 'empty' {
  const hasAnyCustomization = logoStep.completed || upgradeStep.completed;

  if (!hasAnyCustomization) return 'empty';

  if (logoStep.verification === 'error' || upgradeStep.verification === 'error') return 'red';
  if (logoStep.verification === 'pending' || upgradeStep.verification === 'pending') return 'yellow';

  return 'green';
}

function getAllErrors(orderBuilder: SupportOrderBuilder): string[] {
  const allErrors: string[] = [];

  [
    orderBuilder.capStyle,
    orderBuilder.premiumUpgrades,
    orderBuilder.logoSetup,
    orderBuilder.accessories,
    orderBuilder.delivery
  ].forEach(step => {
    if (step.errors) {
      allErrors.push(...step.errors);
    }
  });

  return allErrors;
}