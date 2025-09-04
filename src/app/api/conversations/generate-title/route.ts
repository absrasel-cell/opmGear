import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, conversationType = 'support' } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    // Take first few messages for context
    const contextMessages = messages.slice(0, 3).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content.substring(0, 500) // Limit content length
    }));

    const systemPrompt = `Generate a short, descriptive title (3-6 words) for this ${conversationType} conversation. 
    The title should capture the main topic or request. Examples:
    - "Logo Design Question"
    - "Bulk Order Pricing"
    - "Custom Cap Colors"
    - "Shipping Timeline"
    - "Order Status Check"
    
    Return only the title, no quotes or extra text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...contextMessages
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    const title = completion.choices[0]?.message?.content?.trim();

    if (!title) {
      return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    
    // Fallback title generation
    const fallbackTitles = [
      'Support Conversation',
      'Product Inquiry',
      'Custom Order',
      'General Question',
      'Quote Request'
    ];
    
    const fallbackTitle = fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];
    
    return NextResponse.json({ title: fallbackTitle });
  }
}