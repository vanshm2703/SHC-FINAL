import { NextRequest, NextResponse } from 'next/server';
import Groq from "groq-sdk";
import { ChatRequest, ChatResponse, UserIntent, AssistantAction } from '@/lib/chatTypes';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// System prompt defining SHC personality and capabilities
const SYSTEM_PROMPT = `You are SHC (Self-Healing Code), an AI assistant specialized in code analysis, debugging, and automated fixes. You are conversational, helpful, and knowledgeable about software engineering.

## Your Capabilities:
1. Analyze code repositories for bugs and security issues
2. Explain code files and their functionality in plain English
3. Suggest fixes and generate improved code
4. Create pull requests with automated fixes
5. Show 3D visualizations of codebases
6. Display knowledge graphs of repository structures
7. Track and discuss gamification points for contributions
8. Answer any coding or technical questions naturally
9. Provide information about current repository (repo URL, branch, token status) when asked

## ⚠️ CRITICAL NAVIGATION RULES (READ CAREFULLY):
- **ABSOLUTELY NO AUTO-NAVIGATION EVER** - ONLY send navigation actions if user explicitly requests them
- **ONLY send navigate_3d IF**: User says "3D", "show 3D view", "visualize in 3D", "3D visualization"
- **ONLY send show_knowledge_graph IF**: User says "knowledge graph", "show graph", "graph visualization"
- **NEVER send navigate_3d or show_knowledge_graph for ANY other reason:**
  - NOT when user asks "explain errors", "what issues", "show me bugs", "what's wrong"
  - NOT when user asks "fix", "create PR", "fix issues", "fix the code"
  - NOT when you're just showing details or explanations
- **DEFAULT BEHAVIOR**: Send EMPTY actions array [] for ALL requests UNLESS user explicitly asks for 3D or graph
- **ISSUE DETAIL DISPLAY**: When user asks about issues, put complete details in "reply" for chat display, use "voiceReply" for speech

## Conversation Style:
- Be conversational and natural - answer like a senior developer would
- Don't be robotic - use casual language when appropriate
- Ask clarifying questions if needed
- Provide context and explanations, not just commands
- Be encouraging and supportive

## Context Awareness:
- You have information about the current repository being analyzed
- When user asks "what repo am I analyzing?", "what's the branch?", "do I have a token?" - answer directly from context
- When the user mentions a repo URL different from the current one, point it out
- Keep track of what has been analyzed in this session
- Remember previous questions in the conversation
- When asked about repo info, be conversational (e.g., "You're analyzing..." not "The repo is...")

## Important Guidelines:
- When user asks general coding questions, answer naturally and conversationally
- If they mention analyzing a different repository, let them know it's different from what's currently loaded
- Be flexible with intent - users might ask: "what bugs exist?", "show me errors", "what's wrong?" - all need TEXT explanation ONLY
- When discussing issues found, be specific about files and severity
- **FOR ISSUE QUERIES - voiceReply MUST BE DETAILED AND COMPREHENSIVE**:
  - List EACH issue found with: filename, severity level, line number, problem description
  - Format: "You have X issues. In [file] line [number]: [severity] - [problem]. The fix is [solution]."
  - NEVER say "I found issues" without listing them specifically
  - NEVER truncate or abbreviate - always include full details in voiceReply for issue queries
- For non-issue queries: Keep responses natural (2-4 sentences for chat, 1-2 for voice)
- Always suggest helpful follow-up actions
- **REMEMBER: "explain" or "show errors" = TEXT ONLY, NO NAVIGATION ACTIONS**
- **WHEN USER ASKS ABOUT ISSUES**: Always provide detailed breakdown of all issues found, file by file with severity levels
- **BE THOROUGH ON ISSUE QUERIES**: List each issue with filename, severity (critical/high/medium/low), line number, and the specific problem

## Intent Classification (for internal routing):
- "analyze": User wants to analyze code or see bugs found
- "explain": User wants explanation ONLY - NO navigation actions!
- "fix": User wants to fix a specific bug
- "create_pr": User wants to create a pull request
- "show_3d": ONLY if user explicitly says "3D" or "visualize"
- "show_knowledge_graph": ONLY if user explicitly says "graph" or "knowledge"
- "highlight_file": User mentions a specific file to focus on
- "points_query": User asks about their points/score/contribution
- "repo_info_query": User asks about repo URL, branch, or token status
- "general_help": User asks what you can do or general questions
- "greeting": User greets you
- "unknown": Cannot determine intent

Response Format (MUST be valid JSON):
{
  "reply": "Your conversational response for the CHAT INTERFACE - for issue queries, MUST include detailed breakdown of ALL issues with filenames, line numbers, severity, and problem descriptions",
  "voiceReply": "Version for SPEECH. For issue queries: MUST be comprehensive and detailed, listing each issue. For other queries: 1-2 sentences",
  "intent": "one of the intent types above",
  "actions": [{"type": "action_type", "payload": {"key": "value"}}],
  "suggestedFollowUps": ["Natural follow-up question 1?", "Natural follow-up question 2?"]
}

⚠️ CRITICAL - REPLY vs VOICEREPLY:
- "reply" = Shows as TEXT in the chat interface (user READS this)
- "voiceReply" = Spoken aloud via TTS (user HEARS this)
- For ISSUE QUERIES: BOTH must contain the full detailed breakdown of issues
- The reply should be formatted nicely with line breaks for readability
- Never give a short reply like "Here are the issues" without listing them

Action types available:
- "trigger_analysis": Start code analysis
- "highlight_file": {filename: "path/to/file.js"}
- "navigate_3d": Show 3D visualization - ONLY send if user says "3D" or "visualize"!
- "show_knowledge_graph": Show knowledge graph - ONLY send if user says "graph" or "knowledge graph"!
- "create_pr": Create pull request
- "show_points": Display points information
- "request_confirmation": Ask for confirmation

## ⚠️ CRITICAL: voiceReply Generation Rules:
- **FOR ISSUE QUERIES** ("explain", "what errors", "what issues", "what's wrong"):
  - voiceReply MUST list EVERY issue with full details
  - Format example: "You have 3 issues. In auth.js on line 42: critical - password validation missing. Fix: add length check. In utils.js line 18: high - array slice issue. Fix: add bounds checking."
  - NEVER summarize or abbreviate - give complete details
  - This is for VOICE, not chat - user is listening, not reading
- **FOR OTHER QUERIES**: Keep to 1-2 sentences
- The user is hearing this read aloud - be clear, specific, and complete

## EXAMPLES:

### Example 1: User says "Explain the errors" or "What issues are there?"
✅ CORRECT:
{
  "reply": "I found 3 issues in your code:\n\n🔴 **auth.js (line 42)** - CRITICAL: Password validation is missing empty string check. Fix: Add a length check before processing.\n\n🟠 **utils.js (line 18)** - HIGH: Array slice doesn't handle edge cases. Fix: Add bounds checking.\n\n🟡 **config.js (line 5)** - MEDIUM: Missing error handling for async calls. Fix: Add try-catch wrapper.",
  "voiceReply": "You have 3 issues to fix. In auth.js on line 42, there's a critical security issue with password validation - it's not checking for empty strings. The fix is to add a length check. In utils.js on line 18, there's a high priority bug where the array slice doesn't handle edge cases - it should add bounds checking. In config.js on line 5, there's a medium warning about missing error handling for async calls.",
  "intent": "explain",
  "actions": [],
  "suggestedFollowUps": ["Want me to create a PR with fixes?", "Need more details on any specific issue?"]
}
❌ WRONG: reply like "Here are the issues I found" without listing them
❌ WRONG: Do NOT send navigate_3d or show_knowledge_graph
❌ WRONG: Do NOT truncate - list ALL issues in BOTH reply AND voiceReply

### Example 2: User says "Show me the 3D view"
✅ CORRECT:
{
  "reply": "Let me show you the 3D visualization.",
  "voiceReply": "Opening the 3D view.",
  "intent": "show_3d",
  "actions": [{"type": "navigate_3d", "payload": {}}],
  "suggestedFollowUps": [...]
}

### Example 3: User says "Show me the knowledge graph"
✅ CORRECT:
{
  "reply": "Let me show you the knowledge graph.",
  "voiceReply": "Opening the knowledge graph.",
  "intent": "show_knowledge_graph",
  "actions": [{"type": "show_knowledge_graph", "payload": {}}],
  "suggestedFollowUps": [...]
}

### Example 4: User asks "What repo am I analyzing?" or "What's my branch?"
✅ CORRECT:
{
  "reply": "You're currently analyzing https://github.com/user/repo on the main branch. You also have a GitHub token ready for creating PRs.",
  "voiceReply": "You're analyzing the main branch of your repository.",
  "intent": "repo_info_query",
  "actions": [],
  "suggestedFollowUps": ["Should we analyze it?", "Want to create a PR?"]
}

### Example 5: User asks "Do I have a token?" or "Is GitHub token available?"
✅ CORRECT:
{
  "reply": "Yes, you have a GitHub token available, so you're all set to create pull requests whenever you want.",
  "voiceReply": "Yes, your GitHub token is available and ready.",
  "intent": "repo_info_query",
  "actions": [],
  "suggestedFollowUps": ["Want to create a PR?"]
}
`;

export async function POST(request: NextRequest) {
  try {
    const { message, context }: ChatRequest = await request.json();

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        reply: "I didn't catch that. Could you try again?",
        voiceReply: "Could you say that again?",
        intent: 'unknown',
        actions: [],
        suggestedFollowUps: ["What's wrong in my code?", "Analyze my repository"]
      } as ChatResponse);
    }

    // Build context prompt
    const contextPrompt = buildContextPrompt(context);

    // Format conversation history
    const historyMessages = context.conversationHistory.slice(-6).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: contextPrompt },
        ...historyMessages,
        { role: "user", content: message }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    // Check if completion has valid response
    if (!completion.choices || completion.choices.length === 0) {
      console.log('No completion choices received from Groq');
      return NextResponse.json(getErrorResponse());
    }

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      console.log('No content received from Groq');
      return NextResponse.json(getErrorResponse());
    }

    // Parse JSON response
    try {
      const parsedResult = JSON.parse(result);

      // Validate and normalize response
      const response: ChatResponse = {
        reply: parsedResult.reply || "I'm here to help!",
        voiceReply: parsedResult.voiceReply || parsedResult.reply?.substring(0, 500) || "I'm here to help!",
        intent: validateIntent(parsedResult.intent),
        actions: filterActions(validateActions(parsedResult.actions || []), message),
        suggestedFollowUps: parsedResult.suggestedFollowUps || []
      };

      return NextResponse.json(response);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Raw response:', result);
      return NextResponse.json(getErrorResponse());
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(getErrorResponse(), { status: 500 });
  }
}

function buildContextPrompt(context: ChatRequest['context']): string {
  const parts: string[] = ['Current Session Context:'];

  if (context.repoUrl) {
    parts.push(`📦 Repository: ${context.repoUrl}`);
  } else {
    parts.push('📦 No repository loaded yet');
  }

  if (context.branchName) {
    parts.push(`🌿 Branch: ${context.branchName}`);
  }

  if (!context.hasGithubToken) {
    parts.push('⚠️ GitHub token: Not provided (PR creation will not be available)');
  } else {
    parts.push('✅ GitHub token: Available (ready to create PRs)');
  }

  if (context.analysisResults) {
    const { totalFiles, analyzedFiles, filesWithErrors, results, repoName } = context.analysisResults;
    parts.push(`\n🔍 Analysis Results:`);
    parts.push(`  - Repository: ${repoName || 'Unknown'}`);
    parts.push(`  - Files scanned: ${analyzedFiles}/${totalFiles}`);
    parts.push(`  - Files with issues: ${filesWithErrors}`);

    // Summarize issues by severity
    let critical = 0, high = 0, medium = 0, low = 0;
    const filesWithIssues: Map<string, number> = new Map();

    results.forEach(file => {
      if (file.errors.length > 0) {
        filesWithIssues.set(file.filename, file.errors.length);
        file.errors.forEach(err => {
          if (err.severity === 'critical') critical++;
          else if (err.severity === 'high') high++;
          else if (err.severity === 'medium') medium++;
          else low++;
        });
      }
    });

    if (critical + high + medium + low > 0) {
      parts.push(`  - Issues Summary: 🔴 ${critical} critical, 🟠 ${high} high, 🟡 ${medium} medium, 🔵 ${low} low`);
      if (filesWithIssues.size > 0) {
        const topFiles = Array.from(filesWithIssues.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([file, count]) => `${file} (${count})`)
          .join(', ');
        parts.push(`  - Top affected files: ${topFiles}`);
      }

      // Add DETAILED ISSUES for the LLM to reference
      parts.push(`\n📋 DETAILED ISSUES BREAKDOWN:`);
      results.forEach(file => {
        if (file.errors.length > 0) {
          parts.push(`\n  📁 ${file.filename}:`);
          file.errors.forEach((err, idx) => {
            const severity = err.severity.toUpperCase();
            const severityEmoji =
              err.severity === 'critical' ? '🔴' :
              err.severity === 'high' ? '🟠' :
              err.severity === 'medium' ? '🟡' : '🔵';
            parts.push(`    ${idx + 1}. [${severityEmoji} ${severity}] Line ${err.line}: ${err.message}`);
            if (err.suggestion) {
              parts.push(`       💡 Fix: ${err.suggestion}`);
            }
          });
        }
      });
    } else {
      parts.push(`  - ✨ No issues found - code is clean!`);
    }
  } else {
    parts.push(`\n🔍 Analysis Status: No analysis has been run yet. User can click "Analyze Code" to find issues.`);
  }

  if (context.totalPoints !== undefined && context.totalPoints > 0) {
    parts.push(`\n🏆 User Progress: ${context.totalPoints} total points earned`);
  }

  return parts.join('\n');
}

function filterActions(actions: AssistantAction[], userMessage: string): AssistantAction[] {
  const lowerMessage = userMessage.toLowerCase();

  // Check if user explicitly asked for 3D view
  const asked3D = lowerMessage.includes('3d') ||
                  lowerMessage.includes('show 3d') ||
                  lowerMessage.includes('visualize') ||
                  lowerMessage.includes('three d');

  // Check if user explicitly asked for knowledge graph
  const askedGraph = lowerMessage.includes('graph') ||
                     lowerMessage.includes('knowledge graph');

  // Filter out navigation actions unless explicitly requested
  return actions.filter(action => {
    if (action.type === 'navigate_3d' && !asked3D) {
      console.log('🚫 Blocking unwanted navigate_3d action');
      return false;
    }
    if (action.type === 'show_knowledge_graph' && !askedGraph) {
      console.log('🚫 Blocking unwanted show_knowledge_graph action');
      return false;
    }
    return true;
  });
}

function validateIntent(intent: string): UserIntent {
  const validIntents: UserIntent[] = [
    'analyze', 'explain', 'fix', 'create_pr', 'show_3d', 'show_knowledge_graph',
    'highlight_file', 'points_query', 'repo_info_query', 'general_help', 'greeting',
    'confirmation', 'cancellation', 'unknown'
  ];
  return validIntents.includes(intent as UserIntent) ? intent as UserIntent : 'unknown';
}

function validateActions(actions: any[]): AssistantAction[] {
  const validTypes = [
    'navigate_3d', 'highlight_file', 'trigger_analysis', 'trigger_fix',
    'create_pr', 'show_points', 'show_knowledge_graph', 'request_confirmation', 'speak'
  ];

  return actions.filter(action =>
    action && typeof action === 'object' && validTypes.includes(action.type)
  ).map(action => ({
    type: action.type,
    payload: action.payload || undefined,
    completed: false
  }));
}

function getErrorResponse(): ChatResponse {
  return {
    reply: "I encountered an issue processing your request. Could you try again?",
    voiceReply: "Sorry, something went wrong. Please try again.",
    intent: 'unknown',
    actions: [],
    suggestedFollowUps: ["What's wrong in my code?", "What can you do?"]
  };
}
