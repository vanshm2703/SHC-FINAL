// =============================================================================
// SHC VOICE + CHAT ASSISTANT TYPE DEFINITIONS
// =============================================================================

import { AnalysisResults, GitHubError } from './types';

// =============================================================================
// ASSISTANT STATE MACHINE
// =============================================================================

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking';

// =============================================================================
// INTENT CLASSIFICATION
// =============================================================================

export type UserIntent =
  | 'analyze'           // "What's wrong with this code?"
  | 'explain'           // "Explain auth.js"
  | 'fix'               // "Fix this bug"
  | 'create_pr'         // "Create a PR"
  | 'show_3d'           // "Show me the codebase"
  | 'show_knowledge_graph' // "Show knowledge graph"
  | 'highlight_file'    // "Show me utils.ts"
  | 'points_query'      // "How many points do I have?"
  | 'repo_info_query'   // "What repo am I analyzing?" / "What's my branch?"
  | 'general_help'      // "What can you do?"
  | 'greeting'          // "Hello", "Hey SHC"
  | 'confirmation'      // "Yes", "Do it"
  | 'cancellation'      // "No", "Cancel"
  | 'unknown';

// =============================================================================
// ASSISTANT ACTIONS
// =============================================================================

export type AssistantActionType =
  | 'navigate_3d'
  | 'highlight_file'
  | 'trigger_analysis'
  | 'trigger_fix'
  | 'create_pr'
  | 'show_points'
  | 'show_knowledge_graph'
  | 'request_confirmation'
  | 'speak';

export interface AssistantAction {
  type: AssistantActionType;
  payload?: {
    filename?: string;
    files?: string[];
    message?: string;
    confirmationType?: 'fix' | 'create_pr';
  };
  completed?: boolean;
}

// =============================================================================
// CHAT MESSAGE
// =============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: UserIntent;
  actions?: AssistantAction[];
  suggestedFollowUps?: string[];
  metadata?: {
    voiceInput?: boolean;
    audioPlayed?: boolean;
    pointsAwarded?: number;
    filesHighlighted?: string[];
  };
}

// =============================================================================
// CHAT CONTEXT
// =============================================================================

export interface ChatContext {
  repoUrl?: string;
  branchName?: string;
  hasGithubToken: boolean;
  analysisResults?: AnalysisResults;
  currentFiles?: string[];
  totalPoints?: number;
  lastUserMessage?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

// =============================================================================
// API REQUEST/RESPONSE
// =============================================================================

export interface ChatRequest {
  message: string;
  context: ChatContext;
}

export interface ChatResponse {
  reply: string;
  voiceReply: string;  // Shortened version for TTS (max 2 sentences)
  intent: UserIntent;
  actions: AssistantAction[];
  suggestedFollowUps?: string[];
}

// =============================================================================
// VOICE STATE
// =============================================================================

export interface VoiceState {
  isListening: boolean;
  isWakeWordActive: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  error?: string;
}

// =============================================================================
// SPEECH OPTIONS
// =============================================================================

export interface SpeechOptions {
  rate?: number;      // 0.1 to 10, default 1
  pitch?: number;     // 0 to 2, default 1
  volume?: number;    // 0 to 1, default 1
  voiceName?: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

export interface VoiceChatAssistantProps {
  // Repository context
  repoUrl: string;
  branchName: string;
  githubToken: string;
  analysisResults: AnalysisResults | null;

  // Callbacks to parent
  onAnalyzeRequested: () => Promise<void>;
  onCreatePRRequested: () => Promise<void>;
  onShowKnowledgeGraph: () => void;
  onShow3DView: () => void;
  onHighlightFile: (filename: string) => void;

  // User info
  userId?: string;
  userEmail?: string;
  totalPoints: number;
  onPointsEarned: (points: number) => void;
}

export interface ChatPanelProps {
  messages: ChatMessage[];
  assistantState: AssistantState;
  isMinimized: boolean;
  onSendMessage: (message: string) => void;
  onToggleVoice: () => void;
  onMinimize: () => void;
  onClose: () => void;
  voiceState: VoiceState;
  isVoiceSupported: boolean;
}

export interface MessageBubbleProps {
  message: ChatMessage;
  isTyping?: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}

export interface ChatHeaderProps {
  state: AssistantState;
  onMinimize: () => void;
  onClose: () => void;
}

export interface VoiceIndicatorProps {
  transcript: string;
  interimTranscript: string;
}

export interface MicButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
}

// =============================================================================
// PENDING ACTION CONFIRMATION
// =============================================================================

export interface PendingConfirmation {
  action: 'fix' | 'create_pr';
  message: string;
  callback: () => Promise<void>;
}

// =============================================================================
// WAKE WORD CONSTANTS
// =============================================================================

export const WAKE_WORD = 'hey shc';
export const WAKE_WORD_VARIANTS = [
  'hey shc',
  'hey s h c',
  'hey sh c',
  'a s h c',
  'hey sec',
  'hey sac',
  "hey ssc",
  'hey sc',
  'hey shc',
  'hey eshc',
  'hey s.h.c',
];

// =============================================================================
// ASSISTANT PERSONALITY
// =============================================================================

export const SHC_PERSONALITY = {
  name: 'SHC',
  fullName: 'Self-Healing Code Assistant',
  greeting: "Hi! I'm SHC, your coding assistant. How can I help you today?",
  wakeWordResponse: "Yes, I'm listening. How can I help?",
  errorResponse: "I encountered an issue. Could you try again?",
  tone: 'professional but friendly',
};
