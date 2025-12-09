import { NextResponse } from 'next/server';
import axios from 'axios';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // 1. Rate Limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const isAllowed = await checkRateLimit(ip);

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    // 2. Input Validation
    const body = await request.json();
    const { rawText, sectionContext, format, guidingQuestions } = body;

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text content is required.' },
        { status: 400 }
      );
    }

    // 3. Call n8n Webhook for AI text enhancement
    const n8nWebhookUrl = process.env.N8N_AI_ENHANCE_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('N8N_AI_ENHANCE_WEBHOOK_URL is not defined');
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }

    // Forward the text to n8n for AI enhancement
    // Request markdown formatted response for rich text support
    const response = await axios.post(n8nWebhookUrl, {
      raw_text: rawText.trim(),
      section_context: sectionContext || 'general',
      format: format || 'markdown', // Request markdown formatted response
      guiding_questions: guidingQuestions || '', // Pass guiding questions for better AI context
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 600000, // 10 minutes timeout
    });

    // 4. Handle n8n Response
    // Response format: [{ original: { improved_text: string, message: string, status: number } }]
    const n8nResponse = response.data;

    console.log('n8n response:', JSON.stringify(n8nResponse));

    // Handle different response formats
    let formattedText = '';

    if (Array.isArray(n8nResponse) && n8nResponse.length > 0) {
      // Direct array format: [{ original: { improved_text: string } }]
      const original = n8nResponse[0]?.original;
      formattedText = original?.improved_text || 
                      original?.formatted_text || 
                      original?.text ||
                      '';
    } else if (n8nResponse?.output && Array.isArray(n8nResponse.output) && n8nResponse.output.length > 0) {
      // Wrapped format: { output: [{ original: { improved_text: string } }] }
      const original = n8nResponse.output[0]?.original;
      formattedText = original?.improved_text || 
                      original?.formatted_text ||
                      original?.text ||
                      '';
    } else if (n8nResponse?.improved_text) {
      // Direct format: { improved_text: string }
      formattedText = n8nResponse.improved_text;
    } else if (n8nResponse?.formatted_text) {
      // Alternative format: { formatted_text: string }
      formattedText = n8nResponse.formatted_text;
    }

    if (!formattedText) {
      console.error('Unexpected n8n response format:', JSON.stringify(n8nResponse));
      return NextResponse.json(
        { error: 'Failed to enhance text. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      formattedText: formattedText
    });

  } catch (error: any) {
    console.error('AI enhance error:', error.message);
    
    // Log detailed error information for debugging
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
    
    if (error.code === 'ECONNABORTED') {
      return NextResponse.json(
        { error: 'AI processing timed out. Please try again.' },
        { status: 504 }
      );
    }
    
    // Handle specific HTTP errors from n8n
    if (error.response?.status === 405) {
      console.error('n8n webhook returned 405 - Method Not Allowed. Check webhook configuration.');
      return NextResponse.json(
        { error: 'AI service configuration error. Please contact support.' },
        { status: 503 }
      );
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('n8n webhook authentication failed.');
      return NextResponse.json(
        { error: 'AI service authentication error. Please contact support.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to enhance text. Please try again.' },
      { status: 500 }
    );
  }
}

