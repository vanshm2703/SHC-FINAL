'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WAKE_WORD_VARIANTS } from '@/lib/chatTypes';
import { isBotSpeaking } from './useVoiceAssistant';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  isWakeWordMode: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: (skipWakeWord?: boolean) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setWakeWordMode: (enabled: boolean) => void;
}

export function useSpeechRecognition(
  onWakeWord?: () => void,
  onFinalTranscript?: (transcript: string) => void
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordMode, setIsWakeWordMode] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const isWakeWordModeRef = useRef(true);
  const transcriptRef = useRef('');

  // Keep refs in sync with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isWakeWordModeRef.current = isWakeWordMode;
  }, [isWakeWordMode]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // CRITICAL: Use module-level function to check if bot is speaking
      if (isBotSpeaking()) {
        console.log('🔇 Ignoring speech result - bot is speaking (module check)');
        return;
      }

      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;

        if (result.isFinal) {
          final += transcriptText;
        } else {
          interim += transcriptText;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        const lowerFinal = final.toLowerCase().trim();

        // Check for wake word
        if (isWakeWordModeRef.current) {
          const hasWakeWord = WAKE_WORD_VARIANTS.some(variant =>
            lowerFinal.includes(variant)
          );

          if (hasWakeWord) {
            setIsWakeWordMode(false);
            isWakeWordModeRef.current = false;
            setTranscript('');
            transcriptRef.current = '';
            setInterimTranscript('');
            onWakeWord?.();
            return;
          }
        }

        // In active mode, accumulate transcript
        if (!isWakeWordModeRef.current) {
          const newTranscript = transcriptRef.current + final;
          setTranscript(newTranscript);
          transcriptRef.current = newTranscript;

          // Clear existing timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          // After 2 seconds of silence, finalize
          silenceTimeoutRef.current = setTimeout(() => {
            // CRITICAL: Check module-level function before finalizing
            if (isBotSpeaking()) {
              console.log('🔇 Silence timeout ignored - bot is speaking (module check)');
              setTranscript('');
              transcriptRef.current = '';
              setInterimTranscript('');
              return;
            }

            const finalTranscript = transcriptRef.current.trim();
            if (finalTranscript) {
              onFinalTranscript?.(finalTranscript);
              setTranscript('');
              transcriptRef.current = '';
              setInterimTranscript('');
              // Return to wake word mode
              setIsWakeWordMode(true);
              isWakeWordModeRef.current = true;
            }
          }, 2000);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'no-speech') {
        // This is normal, just restart
        setError(null);
      } else if (event.error === 'aborted') {
        // Intentionally stopped
        setError(null);
      } else {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      // CRITICAL: Don't restart if bot is speaking (module-level check)
      if (isBotSpeaking()) {
        console.log('🔇 Recognition ended - not restarting (bot speaking - module check)');
        return;
      }

      // Restart if we're supposed to be listening
      if (isListeningRef.current) {
        // Small delay before restarting to avoid rapid restarts
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        restartTimeoutRef.current = setTimeout(() => {
          // Double-check bot isn't speaking before restarting (module-level)
          if (isBotSpeaking()) {
            console.log('🔇 Restart cancelled - bot is speaking (module check)');
            return;
          }
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // May already be running
            }
          }
        }, 100);
      }
    };

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      try {
        recognition.stop();
      } catch (e) {
        // May not be running
      }
    };
  }, [isSupported, onWakeWord, onFinalTranscript]);

  const startListening = useCallback((skipWakeWord = false) => {
    if (!recognitionRef.current || !isSupported) return;

    // If skipWakeWord is true, go directly to active listening mode
    if (skipWakeWord) {
      setIsWakeWordMode(false);
      isWakeWordModeRef.current = false;
    }

    // If already listening, just update the mode if needed and return
    if (isListeningRef.current) {
      console.log('Already listening, mode set to:', skipWakeWord ? 'active' : 'wake word');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
      console.log('✅ Speech recognition started');
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e.message);
      // If it fails (already running), just mark as listening
      if (e.name === 'InvalidStateError') {
        console.log('Recognition already running, marking as listening...');
        setIsListening(true);
        isListeningRef.current = true;
      } else {
        // For other errors, try to stop and restart after a delay
        try {
          recognitionRef.current.stop();
        } catch (e2) {
          // Ignore stop errors
        }

        // Wait longer before retrying to avoid rapid-fire errors
        setTimeout(() => {
          try {
            if (recognitionRef.current && !isListeningRef.current) {
              recognitionRef.current.start();
              setIsListening(true);
              isListeningRef.current = true;
            }
          } catch (e3) {
            console.error('Failed to restart after error:', e3);
          }
        }, 500); // Increased from 100ms to 500ms
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    console.log('🛑 Stopping speech recognition...');

    // Clear ALL pending timeouts FIRST
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    // Use abort() which is more aggressive than stop()
    try {
      recognitionRef.current.abort();
    } catch (e) {
      // Try stop as fallback
      try {
        recognitionRef.current.stop();
      } catch (e2) {
        // May not be running
      }
    }

    // Clear ALL state immediately
    setIsListening(false);
    isListeningRef.current = false;
    setIsWakeWordMode(true);
    isWakeWordModeRef.current = true;
    setTranscript('');
    transcriptRef.current = '';
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    transcriptRef.current = '';
    setInterimTranscript('');
  }, []);

  const setWakeWordModeCallback = useCallback((enabled: boolean) => {
    setIsWakeWordMode(enabled);
    isWakeWordModeRef.current = enabled;
    if (enabled) {
      setTranscript('');
      transcriptRef.current = '';
      setInterimTranscript('');
    }
  }, []);

  return {
    isListening,
    isSupported,
    isWakeWordMode,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    setWakeWordMode: setWakeWordModeCallback,
  };
}
