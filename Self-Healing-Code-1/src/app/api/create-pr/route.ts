import { NextRequest, NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface FixRequest {
  repoUrl: string;
  branchName?: string;
  githubToken: string;
  analysisResults: {
    filename: string;
    errors: Array<{
      type: string;
      message: string;
      line: number;
      suggestion?: string;
    }>;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const { repoUrl, branchName = 'main', githubToken, analysisResults }: FixRequest = await request.json();

    // Validate input
    if (!repoUrl || !githubToken || !analysisResults) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Parse GitHub URL
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoUrl.match(regex);
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
    }

    const owner = match[1];
    const repo = match[2].replace('.git', '');
    const newBranchName = `auto-fix-${Date.now()}`;

    console.log(`Creating PR for ${owner}/${repo}`);

    try {
      // Get the base branch SHA
      const baseBranchResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Self-Healing-Code-App',
          },
        }
      );

      if (!baseBranchResponse.ok) {
        const errorData = await baseBranchResponse.json();
        throw new Error(`Failed to get base branch: ${errorData.message}`);
      }

      const baseBranchData = await baseBranchResponse.json();
      const baseSha = baseBranchData.object.sha;

      // Create new branch
      const createBranchResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Self-Healing-Code-App',
        },
        body: JSON.stringify({
          ref: `refs/heads/${newBranchName}`,
          sha: baseSha,
        }),
      });

      if (!createBranchResponse.ok) {
        const errorData = await createBranchResponse.json();
        throw new Error(`Failed to create branch: ${errorData.message}`);
      }

      console.log(`Created branch: ${newBranchName}`);

      // Process each file with errors
      for (const fileResult of analysisResults) {
        try {
          // Get original file content
          const fileResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${fileResult.filename}?ref=${branchName}`,
            {
              headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Self-Healing-Code-App',
              },
            }
          );

          if (!fileResponse.ok) {
            console.log(`Skipping file ${fileResult.filename} - could not fetch`);
            continue;
          }

          const fileData = await fileResponse.json();
          const originalContent = atob(fileData.content);

          // Generate fixed code using Groq
          const fixedContent = await generateFixedCode(fileResult.filename, originalContent, fileResult.errors);

          // Update file in new branch
          const updateFileResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${fileResult.filename}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Self-Healing-Code-App',
              },
              body: JSON.stringify({
                message: `🤖 Fix issues in ${fileResult.filename}\n\n${fileResult.errors.map(e => `- ${e.message}`).join('\n')}`,
                content: btoa(fixedContent),
                sha: fileData.sha,
                branch: newBranchName,
              }),
            }
          );

          if (!updateFileResponse.ok) {
            const errorData = await updateFileResponse.json();
            console.error(`Failed to update ${fileResult.filename}:`, errorData);
          } else {
            console.log(`Updated file: ${fileResult.filename}`);
          }

        } catch (fileError) {
          console.error(`Error processing file ${fileResult.filename}:`, fileError);
        }
      }

      // Create pull request
      const totalIssues = analysisResults.reduce((sum, file) => sum + file.errors.length, 0);
      const prBody = `## 🤖 Automated Code Fixes

This PR contains automatic fixes for **${totalIssues} code quality issues** detected by AI analysis.

### 📁 Files Fixed:
${analysisResults.map(file => `- \`${file.filename}\` (${file.errors.length} issues)`).join('\n')}

### 🔧 Issues Addressed:
${analysisResults.flatMap(file => 
  file.errors.map(error => `- **${file.filename}:${error.line}** - ${error.message}`)
).join('\n')}

### 🚀 Auto-Generated Fixes:
Each error has been automatically corrected using AI-powered code analysis and generation.

---
> 🤖 Generated by [Self-Healing Code AI](https://github.com) | Review changes carefully before merging`;

      const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Self-Healing-Code-App',
        },
        body: JSON.stringify({
          title: `🤖 Auto-fix: ${totalIssues} code quality improvements`,
          head: newBranchName,
          base: branchName,
          body: prBody,
        }),
      });

      if (!prResponse.ok) {
        const errorData = await prResponse.json();
        throw new Error(`Failed to create pull request: ${errorData.message}`);
      }

      const prData = await prResponse.json();
      console.log(`Created PR: ${prData.html_url}`);

      return NextResponse.json({
        success: true,
        prUrl: prData.html_url,
        prNumber: prData.number,
        branchName: newBranchName,
        message: `Successfully created PR #${prData.number} with fixes for ${totalIssues} issues`
      });

    } catch (githubError: any) {
      console.error('GitHub API error:', githubError);
      return NextResponse.json({ 
        error: `GitHub API error: ${githubError.message}` 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('PR creation error:', error);
    return NextResponse.json({ 
      error: `Failed to create PR: ${error.message}` 
    }, { status: 500 });
  }
}

// Helper function to generate fixed code
async function generateFixedCode(filename: string, originalCode: string, errors: any[]): Promise<string> {
  const fixPrompt = `Fix the following code issues in ${filename}:

Original Code:
${originalCode}

Issues to fix:
${errors.map(error => `- Line ${error.line}: ${error.message} (Suggestion: ${error.suggestion})`).join('\n')}

Return ONLY the corrected code without any explanations, markdown formatting, or code blocks. Just the raw fixed code:`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: fixPrompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 4000,
    });

    const result = completion.choices[0]?.message?.content;
    
    if (!result) {
      console.log('No fixed code received from Groq');
      return originalCode;
    }
    
    // Clean up the response - remove markdown code blocks if present
    let fixedCode = result.trim();
    if (fixedCode.startsWith('```')) {
      const lines = fixedCode.split('\n');
      fixedCode = lines.slice(1, -1).join('\n');
    }
    
    console.log(`Generated fixed code for ${filename} (${fixedCode.length} chars)`);
    return fixedCode;

  } catch (error) {
    console.error('Fix generation error:', error);
    return originalCode;
  }
}