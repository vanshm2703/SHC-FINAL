import { NextRequest, NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // Add your Groq API key to .env.local
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Invalid prompt provided' }, { status: 400 });
    }
    
    // Enhanced prompt for better error detection with severity classification
    const enhancedPrompt = `You are a code analysis expert. Analyze the provided code and identify ALL issues including syntax errors, logic bugs, security vulnerabilities, performance problems, and code quality issues.

Classify each issue with a severity level:
- "critical": Security vulnerabilities, data loss risks, crashes, infinite loops, memory leaks that crash the app
- "high": Logic errors that produce wrong results, unhandled exceptions, race conditions, SQL injection potential
- "medium": Performance issues, missing error handling, deprecated API usage, poor resource management
- "low": Code style issues, missing documentation, naming convention violations, minor code smells

Also set "type" to "error" for critical/high severity, and "warning" for medium/low.

${prompt}

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format. Do not include any explanations, markdown, or other text:
{
  "errors": [
    {
      "type": "error",
      "severity": "high",
      "message": "Clear description of the specific issue",
      "line": 1,
      "suggestion": "Specific fix recommendation"
    }
  ]
}

If no issues are found, return: {"errors": []}`;

    console.log('Sending prompt to Groq:', enhancedPrompt.substring(0, 200) + '...');
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: enhancedPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    // Check if completion has valid response
    if (!completion.choices || completion.choices.length === 0) {
      console.log('No completion choices received from Groq');
      return NextResponse.json({ errors: [] });
    }

    const result = completion.choices[0]?.message?.content;
    console.log('Groq response:', result);
    
    // Check if result exists and is valid
    if (!result) {
      console.log('No content received from Groq');
      return NextResponse.json({ errors: [] });
    }
    
    // Parse JSON response from Groq
    try {
      const parsedResult = JSON.parse(result);
      console.log('Parsed result:', parsedResult);
      
      // Validate the response structure
      if (parsedResult && typeof parsedResult === 'object' && Array.isArray(parsedResult.errors)) {
        // Normalize severity values - fallback if AI omits or returns unexpected value
        const validSeverities = ['critical', 'high', 'medium', 'low'];
        parsedResult.errors = parsedResult.errors.map((err: any) => ({
          ...err,
          severity: validSeverities.includes(err.severity) ? err.severity :
            err.type === 'error' ? 'high' : 'medium',
        }));
        return NextResponse.json(parsedResult);
      } else {
        console.log('Invalid response structure:', parsedResult);
        return NextResponse.json({ errors: [] });
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Raw response that failed to parse:', result);
      // If JSON parsing fails, return empty errors array
      return NextResponse.json({ errors: [] });
    }
  } catch (error) {
    console.error('Groq API error:', error);
    return NextResponse.json({ error: 'Failed to analyze code' }, { status: 500 });
  }
}