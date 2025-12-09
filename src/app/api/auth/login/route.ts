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
    const { userId, email } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and Email are required.' },
        { status: 400 }
      );
    }

    // 3. Call n8n Webhook
    const n8nWebhookUrl = process.env.N8N_AUTH_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('N8N_AUTH_WEBHOOK_URL is not defined');
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }

    // Forward the credentials to n8n
    const response = await axios.post(n8nWebhookUrl, {
      userId,
      email,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Add any secret headers if n8n requires them
      },
      timeout: 600000, // 10 minutes timeout
    });

    // 4. Handle n8n Response
    // Response format: { output: [{ headers: [], original: { status: 200|401|404, message: string, data?: array }, exception: null }], status: 'success', ... }
    const n8nResponse = response.data;

    if (!n8nResponse || !n8nResponse.output || !Array.isArray(n8nResponse.output) || n8nResponse.output.length === 0) {
      console.error('Unexpected n8n response format - missing output array:', n8nResponse);
      return NextResponse.json(
        { error: 'Authentication failed. Please try again.' },
        { status: 500 }
      );
    }

    const data = n8nResponse.output[0]?.original;

    if (!data) {
      console.error('Unexpected n8n response format - no original data:', n8nResponse.output[0]);
      return NextResponse.json(
        { error: 'Authentication failed. Please try again.' },
        { status: 500 }
      );
    }

    if (data.status === 200 && data.message === "Authenticated" && data.data && data.data.length > 0) {
      // Success - extract user data from data[0]
      const userData = data.data[0];
      return NextResponse.json({
        success: true,
        user: {
          id: userData.id,
          employee_id: userData.employee_id,
          employee_name: userData.employee_name,
          employee_email: userData.employee_email,
          position: userData.position,
          company: userData.company,
          created_at: userData.created_at,
        }
      });
    } else if (data.status === 401 && data.message === "Unauthorized: Email does not match") {
      return NextResponse.json(
        { error: 'Unauthorized: Email does not match' },
        { status: 401 }
      );
    } else if (data.status === 404 && data.message === "User Not Found") {
      return NextResponse.json(
        { error: 'User Not Found' },
        { status: 404 }
      );
    } else {
      // Handle unexpected response format
      console.error('Unexpected n8n response:', data);
      return NextResponse.json(
        { error: 'Authentication failed. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Login error:', error.message);
    return NextResponse.json(
      { error: 'Authentication failed. Please try again.' },
      { status: 500 }
    );
  }
}
