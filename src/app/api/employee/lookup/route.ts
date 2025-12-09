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
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required.' },
        { status: 400 }
      );
    }

    // 3. Call n8n Webhook for employee lookup
    const n8nWebhookUrl = process.env.N8N_EMPLOYEE_LOOKUP_WEBHOOK_URL;

    if (!n8nWebhookUrl) {
      console.error('N8N_EMPLOYEE_LOOKUP_WEBHOOK_URL is not defined');
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }

    // Forward the employee ID to n8n
    const response = await axios.post(n8nWebhookUrl, {
      employee_id: employeeId,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 600000, // 10 minutes timeout
    });

    // 4. Handle n8n Response
    // Response format: { output: [{ headers: [], original: { status: 200|404, message: string, data?: array }, exception: null }], status: 'success', ... }
    const n8nResponse = response.data;

    if (!n8nResponse || !n8nResponse.output || !Array.isArray(n8nResponse.output) || n8nResponse.output.length === 0) {
      console.error('Unexpected n8n response format - missing output array:', n8nResponse);
      return NextResponse.json(
        { error: 'Failed to lookup employee. Please try again.' },
        { status: 500 }
      );
    }

    const data = n8nResponse.output[0]?.original;

    if (!data) {
      console.error('Unexpected n8n response format - no original data:', n8nResponse.output[0]);
      return NextResponse.json(
        { error: 'Failed to lookup employee. Please try again.' },
        { status: 500 }
      );
    }

    if (data.status === 200 && data.data && data.data.length > 0) {
      // Success - extract employee data from data[0]
      const employeeData = data.data[0];
      return NextResponse.json({
        success: true,
        employee: {
          id: employeeData.id,
          employee_id: employeeData.employee_id,
          employee_name: employeeData.employee_name,
          employee_email: employeeData.employee_email,
          position: employeeData.position,
          company: employeeData.company,
          created_at: employeeData.created_at,
        }
      });
    } else if (data.status === 404) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    } else {
      // Handle unexpected response format
      console.error('Unexpected n8n response:', data);
      return NextResponse.json(
        { error: 'Failed to lookup employee. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Employee lookup error:', error.message);
    return NextResponse.json(
      { error: 'Failed to lookup employee. Please try again.' },
      { status: 500 }
    );
  }
}

