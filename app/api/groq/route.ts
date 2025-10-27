import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Groq API route is working',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('Groq API POST route called');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    const { message } = body;
    console.log('Received message:', message);

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if Groq API key is configured
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    
    if (!GROQ_API_KEY) {
      console.log('No GROQ_API_KEY found in environment variables');
      return NextResponse.json({ error: 'Groq API key not configured. Please set GROQ_API_KEY in your .env.local file.' }, { status: 500 });
    }

    // Prepare the request to Groq
    const groqRequest = {
      model: 'gpt-oss-120b',
      messages: [
        {
          role: 'system',
          content: 'You are a Windows command expert. Generate ONLY Windows PowerShell or CMD commands based on user requests. ALL commands must be for Windows systems only. Use PowerShell syntax when possible. Do not include explanations, just the command.'
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      stream: false
    };

    console.log('Calling Groq API...');
    
    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(groqRequest),
    });

    console.log('Groq API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to call Groq API',
        details: errorText 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('Groq API response data:', data);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json({ 
        error: 'Invalid response from Groq API' 
      }, { status: 500 });
    }

    const generatedCommand = data.choices[0].message.content.trim();
    console.log('Generated command:', generatedCommand);

    return NextResponse.json({
      response: generatedCommand,
      model: 'gpt-oss-120b',
      usage: data.usage
    });

  } catch (error) {
    console.error('Error in Groq API route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
