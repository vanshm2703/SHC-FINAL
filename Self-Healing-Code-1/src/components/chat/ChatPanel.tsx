'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { ChatPanelProps } from '@/lib/chatTypes';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { VoiceIndicator } from './VoiceIndicator';
import { TypingIndicator } from './TypingIndicator';
import { MicButton } from './MicButton';
import { cn } from '@/lib/utils';

export function ChatPanel({
  messages,
  assistantState,
  isMinimized,
  onSendMessage,
  onToggleVoice,
  onMinimize,
  onClose,
  voiceState,
  isVoiceSupported,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, assistantState]);

  // Focus input when chat opens
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (text) {
      onSendMessage(text);
      setInputText('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  if (isMinimized) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 100, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-4 right-4 w-96 h-[550px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden z-50"
    >
      {/* Header */}
      <ChatHeader
        state={assistantState}
        onMinimize={onMinimize}
        onClose={onClose}
      />

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800"
      >
        {/* Welcome message if no messages */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">SHC</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
              Hi! I&apos;m SHC
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Your AI coding assistant. Ask me about bugs, code analysis, or say &ldquo;Hey SHC&rdquo; to start a voice conversation.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "What's wrong in my code?",
                "Analyze my repository",
                "What can you do?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onSuggestionClick={handleSuggestionClick}
          />
        ))}

        {/* Typing indicator when thinking */}
        {assistantState === 'thinking' && <TypingIndicator />}
      </div>

      {/* Voice indicator when listening */}
      <AnimatePresence>
        {voiceState.isListening && (
          <VoiceIndicator
            transcript={voiceState.transcript}
            interimTranscript={voiceState.interimTranscript}
            isWakeWordMode={voiceState.isWakeWordActive}
          />
        )}
      </AnimatePresence>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voiceState.isListening ? "Listening..." : "Type a message..."}
            disabled={voiceState.isListening && !voiceState.isWakeWordActive}
            className={cn(
              "flex-1 px-4 py-2.5 text-sm rounded-full border border-gray-200 dark:border-gray-700",
              "bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />

          {/* Mic Button */}
          <MicButton
            isListening={voiceState.isListening}
            isSupported={isVoiceSupported}
            onClick={onToggleVoice}
            disabled={assistantState === 'thinking'}
          />

          {/* Send Button */}
          <motion.button
            type="submit"
            disabled={!inputText.trim() || assistantState === 'thinking'}
            className={cn(
              "p-2.5 rounded-full transition-colors",
              inputText.trim()
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90"
                : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
            )}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Wake word hint */}
        {isVoiceSupported && !voiceState.isListening && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-2">
            Say &ldquo;Hey SHC&rdquo; or click the mic to start voice input
          </p>
        )}
      </form>
    </motion.div>
  );
}
