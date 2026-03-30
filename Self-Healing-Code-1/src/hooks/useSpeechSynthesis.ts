'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SpeechOptions } from '@/lib/chatTypes';

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string, options?: SpeechOptions) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<Array<{ text: string; options?: SpeechOptions }>>([]);
  const isProcessingRef = useRef(false);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Auto-select a good default voice
      if (!selectedVoice && availableVoices.length > 0) {
        // Prefer Google voices, then any English voice
        const preferredVoice =
          availableVoices.find(v =>
            v.name.includes('Google') && v.lang.startsWith('en-US')
          ) ||
          availableVoices.find(v =>
            v.name.includes('Google') && v.lang.startsWith('en')
          ) ||
          availableVoices.find(v =>
            v.lang.startsWith('en-US') && !v.name.includes('Microsoft')
          ) ||
          availableVoices.find(v => v.lang.startsWith('en')) ||
          availableVoices[0];

        if (preferredVoice) {
          setSelectedVoice(preferredVoice);
        }
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Also listen for voiceschanged event (needed for Chrome)
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported, selectedVoice]);

  // Process speech queue
  const processQueue = useCallback(() => {
    if (!isSupported || isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const { text, options } = queueRef.current.shift()!;

    const utterance = new SpeechSynthesisUtterance(text);

    // Apply options
    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    // Use selected voice or find one
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else if (options?.voiceName) {
      const voice = voices.find(v => v.name === options.voiceName);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      isProcessingRef.current = false;
      setIsSpeaking(false);

      // Process next item in queue
      if (queueRef.current.length > 0) {
        // Small delay between utterances
        setTimeout(processQueue, 100);
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      isProcessingRef.current = false;
      setIsSpeaking(false);

      // Try to process next in queue on error
      if (queueRef.current.length > 0) {
        setTimeout(processQueue, 100);
      }
    };

    utteranceRef.current = utterance;

    try {
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Failed to speak:', e);
      isProcessingRef.current = false;
      setIsSpeaking(false);
    }
  }, [isSupported, selectedVoice, voices]);

  const speak = useCallback((text: string, options?: SpeechOptions) => {
    if (!isSupported || !text.trim()) return;

    // Cancel any ongoing speech before new speech
    window.speechSynthesis.cancel();
    queueRef.current = [];
    isProcessingRef.current = false;

    // Add to queue and process
    queueRef.current.push({ text: text.trim(), options });
    processQueue();
  }, [isSupported, processQueue]);

  const cancel = useCallback(() => {
    if (!isSupported) return;

    queueRef.current = [];
    isProcessingRef.current = false;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
  }, [isSupported]);

  return {
    isSpeaking,
    isSupported,
    speak,
    cancel,
    pause,
    resume,
    voices,
    selectedVoice,
    setSelectedVoice,
  };
}
