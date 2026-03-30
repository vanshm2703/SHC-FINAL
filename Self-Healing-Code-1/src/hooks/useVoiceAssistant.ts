'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useSpeechSynthesis } from './useSpeechSynthesis';
import {
  ChatMessage,
  AssistantState,
  ChatContext,
  ChatResponse,
  VoiceChatAssistantProps,
  PendingConfirmation,
  VoiceState,
  SHC_PERSONALITY,
} from '@/lib/chatTypes';
import toast from 'react-hot-toast';

// MODULE-LEVEL FLAG - completely outside React lifecycle
// This ensures NO closure issues or stale state
let IS_BOT_SPEAKING = false;

export function setBotSpeaking(value: boolean) {
  IS_BOT_SPEAKING = value;
  console.log(`🔊 Bot speaking: ${value}`);
}

export function isBotSpeaking(): boolean {
  return IS_BOT_SPEAKING;
}

export interface UseVoiceAssistantReturn {
  messages: ChatMessage[];
  assistantState: AssistantState;
  voiceState: VoiceState;
  isVoiceSupported: boolean;
  pendingConfirmation: PendingConfirmation | null;
  processUserMessage: (text: string, isVoice?: boolean) => Promise<void>;
  startListening: (skipWakeWord?: boolean) => void;
  stopListening: () => void;
  speak: (text: string) => void;
  cancelSpeech: () => void;
  confirmAction: () => Promise<void>;
  cancelAction: () => void;
  clearMessages: () => void;
}

export function useVoiceAssistant(props: VoiceChatAssistantProps): UseVoiceAssistantReturn {
  const {
    repoUrl,
    branchName,
    githubToken,
    analysisResults,
    onAnalyzeRequested,
    onCreatePRRequested,
    onShow3DView,
    onShowKnowledgeGraph,
    onHighlightFile,
    totalPoints,
    onPointsEarned,
  } = props;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  // ALL REFS MUST BE DEFINED HERE - BEFORE any callbacks that use them
  const isProcessingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const assistantStateRef = useRef<AssistantState>('idle');
  // NOTE: Bot speaking flag is now MODULE-LEVEL (IS_BOT_SPEAKING) - see top of file

  // Keep props in refs to always have latest values
  // NOTE: Refs are initialized AND immediately updated to ensure no stale values
  const repoUrlRef = useRef(repoUrl);
  const branchNameRef = useRef(branchName);
  const githubTokenRef = useRef(githubToken);
  const analysisResultsRef = useRef(analysisResults);
  const totalPointsRef = useRef(totalPoints);

  // IMMEDIATE sync - ensures refs are ALWAYS current before any callbacks run
  // This runs synchronously during render, not after like useEffect
  repoUrlRef.current = repoUrl;
  branchNameRef.current = branchName;
  githubTokenRef.current = githubToken;
  analysisResultsRef.current = analysisResults;
  totalPointsRef.current = totalPoints;

  // Keep messages ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Log context changes for debugging
  useEffect(() => {
    console.log('📍 Context updated:', { repoUrl, branchName, hasToken: !!githubToken, tokenLength: githubToken?.length || 0, hasAnalysis: !!analysisResults });
  }, [repoUrl, branchName, githubToken, analysisResults, totalPoints]);

  // Speech synthesis hook
  const { speak, isSpeaking, cancel: cancelSpeech, isSupported: isSynthesisSupported } = useSpeechSynthesis();

  // Handle wake word detection
  const handleWakeWord = useCallback(() => {
    setAssistantState('listening');
    toast.success("I'm listening! How can I help?", { icon: '🎤', duration: 2000 });
    speak(SHC_PERSONALITY.wakeWordResponse);
  }, [speak]);

  // Handle final transcript from voice
  const handleFinalTranscript = useCallback(async (transcript: string) => {
    // Don't process transcripts if:
    // 1. Already processing a message
    // 2. Bot is currently speaking (prevents picking up bot's own voice) - uses MODULE-LEVEL check
    // 3. Transcript is empty
    if (!transcript.trim() || isProcessingRef.current || assistantStateRef.current === 'speaking' || isBotSpeaking()) {
      console.log('🚫 Ignoring transcript:', {
        empty: !transcript.trim(),
        processing: isProcessingRef.current,
        speaking: assistantStateRef.current === 'speaking',
        botSpeaking: isBotSpeaking(),
        transcript: transcript.substring(0, 50)
      });
      return;
    }
    await processUserMessageInternal(transcript, true);
  }, []);

  // Speech recognition hook - uses module-level isBotSpeaking() internally
  const {
    isListening,
    isSupported: isRecognitionSupported,
    isWakeWordMode,
    transcript,
    interimTranscript,
    error: recognitionError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(handleWakeWord, handleFinalTranscript);

  // Voice state object
  const voiceState: VoiceState = {
    isListening,
    isWakeWordActive: isWakeWordMode,
    transcript,
    interimTranscript,
    confidence: 1,
    error: recognitionError || undefined,
  };

  const isVoiceSupported = isRecognitionSupported && isSynthesisSupported;

  // Keep assistantStateRef in sync with state
  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  // Process user message (internal implementation)
  const processUserMessageInternal = useCallback(async (text: string, isVoice = false) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      metadata: { voiceInput: isVoice },
    };

    setMessages(prev => [...prev, userMessage]);
    setAssistantState('thinking');
    resetTranscript();

    try {
      // Build context for API - use refs to get latest values
      const context: ChatContext = {
        repoUrl: repoUrlRef.current || undefined,
        branchName: branchNameRef.current || undefined,
        hasGithubToken: !!githubTokenRef.current,
        analysisResults: analysisResultsRef.current || undefined,
        totalPoints: totalPointsRef.current,
        conversationHistory: messagesRef.current.slice(-6).map(m => ({
          role: m.role,
          content: m.content,
        })),
      };

      console.log('📤 Sending context to API:', {
        repoUrl: context.repoUrl ? '✓' : '✗',
        repoUrlValue: context.repoUrl,
        branchName: context.branchName,
        hasToken: context.hasGithubToken,
        tokenValue: githubTokenRef.current ? `${githubTokenRef.current.substring(0, 10)}...` : 'EMPTY',
        hasAnalysis: !!context.analysisResults,
        filesWithIssues: context.analysisResults?.results?.length || 0
      });

      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context }),
      });

      const data: ChatResponse = await response.json();

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
        intent: data.intent,
        actions: data.actions,
        suggestedFollowUps: data.suggestedFollowUps,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Process actions
      await processActions(data, isVoice);

      // Speak response if voice input
      if (isVoice && data.voiceReply) {
        setAssistantState('speaking');
        // Set MODULE-LEVEL flag FIRST to prevent picking up bot's voice
        setBotSpeaking(true);
        // Stop listening before speaking
        stopListening();
        speak(data.voiceReply);
      } else {
        setAssistantState('idle');
      }

    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: SHC_PERSONALITY.errorResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      if (isVoice) {
        // Speak error then set to speaking to trigger restart after speech finishes
        setAssistantState('speaking');
        // Set MODULE-LEVEL flag FIRST to prevent picking up bot's voice
        setBotSpeaking(true);
        // Stop listening before speaking to prevent picking up bot's voice
        stopListening();
        speak(SHC_PERSONALITY.errorResponse);
      } else {
        setAssistantState('idle');
      }
    } finally {
      isProcessingRef.current = false;
      // Don't restart listening here - let the speaking completion handler do it
      // This prevents conflicts and ensures proper sequencing
    }
  }, [speak, resetTranscript]);

  // Process actions from AI response
  const processActions = useCallback(async (response: ChatResponse, shouldSpeak: boolean) => {
    for (const action of response.actions) {
      switch (action.type) {
        case 'trigger_analysis':
          console.log('🔍 Analysis requested - Checking context:', {
            hasRepoUrl: !!repoUrlRef.current,
            repoUrl: repoUrlRef.current,
            hasBranch: !!branchNameRef.current,
            branch: branchNameRef.current
          });
          
          // Validate we have the necessary info before triggering analysis
          if (!repoUrlRef.current || !repoUrlRef.current.trim()) {
            const msg = "Please enter a repository URL first before analyzing.";
            console.error('❌ No repository URL for analysis');
            toast.error(msg);
            if (shouldSpeak) speak(msg);
            break;
          }
          
          toast.loading('Starting analysis...', { duration: 2000 });
          try {
            await onAnalyzeRequested();
            if (shouldSpeak) {
              speak("Analysis complete. I found some issues in your code.");
            }
          } catch (e) {
            console.error('Analysis failed:', e);
          }
          break;

        case 'create_pr':
          // Use REF to get latest token value (avoids stale closure)
          console.log('🔐 PR Creation check:', {
            hasRepo: !!repoUrlRef.current,
            repoUrl: repoUrlRef.current,
            hasBranch: !!branchNameRef.current,
            branch: branchNameRef.current,
            hasToken: !!githubTokenRef.current,
            tokenLength: githubTokenRef.current?.length || 0,
            hasAnalysis: !!analysisResultsRef.current,
            issueCount: analysisResultsRef.current?.results?.length || 0
          });
          
          // Check repository URL first
          if (!repoUrlRef.current || !repoUrlRef.current.trim()) {
            const msg = "Please enter a repository URL first.";
            console.error('❌ No repository URL for PR creation');
            toast.error(msg);
            if (shouldSpeak) speak(msg);
            break;
          }
          
          // Check GitHub token
          if (!githubTokenRef.current) {
            const msg = "You need to provide a GitHub token first to create pull requests.";
            console.error('❌ GitHub token missing for PR creation');
            toast.error(msg);
            if (shouldSpeak) speak(msg);
            break;
          }
          
          // Check if we have analysis results
          if (!analysisResultsRef.current || !analysisResultsRef.current.results || analysisResultsRef.current.results.length === 0) {
            const msg = "Please analyze the repository first to find issues before creating a PR.";
            console.error('❌ No analysis results for PR creation');
            toast.error(msg);
            if (shouldSpeak) speak(msg);
            break;
          }
          
          // All checks passed - proceed with PR creation
          setPendingConfirmation({
            action: 'create_pr',
            message: 'Create a pull request with the fixes?',
            callback: async () => {
              try {
                await onCreatePRRequested();
                toast.success('Pull request created!');
                if (shouldSpeak) {
                  speak("Great! I've created the pull request with the fixes.");
                }
              } catch (e) {
                console.error('PR creation failed:', e);
                toast.error('Failed to create PR');
              }
            },
          });
          break;

        case 'navigate_3d':
          onShow3DView();
          if (shouldSpeak) {
            speak("Here's the 3D view of your codebase.");
          }
          break;

        case 'show_knowledge_graph':
          onShowKnowledgeGraph();
          if (shouldSpeak) {
            speak("Here's the knowledge graph of your repository.");
          }
          break;

        case 'highlight_file':
          if (action.payload?.filename) {
            onHighlightFile(action.payload.filename);
            if (shouldSpeak) {
              speak(`Highlighting ${action.payload.filename} in the 3D view.`);
            }
          }
          break;

        case 'show_points':
          const pointsMsg = `You have ${totalPoints} total points.`;
          toast.success(pointsMsg, { icon: '🏆' });
          if (shouldSpeak) {
            speak(pointsMsg);
          }
          break;

        case 'request_confirmation':
          // Handle confirmation requests
          if (action.payload?.confirmationType === 'create_pr') {
            setPendingConfirmation({
              action: 'create_pr',
              message: 'Would you like me to create a pull request?',
              callback: onCreatePRRequested,
            });
          }
          break;
      }
    }
  }, [onAnalyzeRequested, onCreatePRRequested, onShow3DView, onShowKnowledgeGraph, onHighlightFile, totalPoints, speak]);

  // Handle speaking completion - restart listening for next message
  useEffect(() => {
    console.log('👂 Speaking completion check:', {
      isSpeaking,
      assistantState,
      shouldRestart: !isSpeaking && assistantState === 'speaking'
    });

    if (!isSpeaking && assistantState === 'speaking') {
      console.log('✅ Bot finished speaking. Waiting before restarting listening...');
      setAssistantState('idle');
      // Restart listening after a delay to ensure bot's voice is fully clear
      resetTranscript();
      // LONGER delay to let any residual audio clear before we start listening again
      setTimeout(() => {
        // Clear the MODULE-LEVEL bot speaking flag ONLY when we're ready to listen
        setBotSpeaking(false);
        console.log('🎤 Calling startListening(true) - bot speaking flag cleared');
        startListening(true); // Active listening (user ready to speak)
      }, 500);
    }
  }, [isSpeaking, assistantState]);

  // Public method to process user message
  const processUserMessage = useCallback(async (text: string, isVoice = false) => {
    await processUserMessageInternal(text, isVoice);
  }, [processUserMessageInternal]);

  // Confirm pending action
  const confirmAction = useCallback(async () => {
    if (pendingConfirmation) {
      try {
        await pendingConfirmation.callback();
      } catch (e) {
        console.error('Action failed:', e);
      }
      setPendingConfirmation(null);
    }
  }, [pendingConfirmation]);

  // Cancel pending action
  const cancelAction = useCallback(() => {
    setPendingConfirmation(null);
    toast('Action cancelled', { icon: '❌' });
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    assistantState,
    voiceState,
    isVoiceSupported,
    pendingConfirmation,
    processUserMessage,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    confirmAction,
    cancelAction,
    clearMessages,
  };
}
