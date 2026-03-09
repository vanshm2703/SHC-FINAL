import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { githubToken } = await request.json();

    if (!githubToken) {
      return NextResponse.json({ valid: false, error: 'Token is required' });
    }

    // Test token validity by calling GitHub API
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Self-Healing-Code-App',
      },
    });

    if (response.ok) {
      const userData = await response.json();
      return NextResponse.json({ 
        valid: true, 
        username: userData.login,
        message: `Token valid for user: ${userData.login}`
      });
    } else {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid or expired token' 
      });
    }

  } catch (error: any) {
    return NextResponse.json({ 
      valid: false, 
      error: `Validation failed: ${error.message}` 
    });
  }
}