'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Mic, MicOff, Volume2 } from 'lucide-react';
import { VoiceChatAssistantProps, AssistantState } from '@/lib/chatTypes';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { ChatPanel } from './chat/ChatPanel';
import { cn } from '@/lib/utils';

interface ToggleButtonProps {
  onClick: () => void;
  assistantState: AssistantState;
  isListening: boolean;
  isVoiceSupported: boolean;
  unreadCount?: number;
}

function ToggleButton({ onClick, assistantState, isListening, isVoiceSupported, unreadCount }: ToggleButtonProps) {
  const getIcon = () => {
    if (isListening) return <Mic className="w-6 h-6" />;
    if (assistantState === 'speaking') return <Volume2 className="w-6 h-6" />;
    return <MessageCircle className="w-6 h-6" />;
  };

  const getColor = () => {
    if (isListening) return 'from-green-500 to-emerald-600';
    if (assistantState === 'speaking') return 'from-orange-500 to-amber-600';
    if (assistantState === 'thinking') return 'from-purple-500 to-indigo-600';
    return 'from-blue-500 to-purple-600';
  };

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white z-50",
        `bg-gradient-to-r ${getColor()}`
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
    >
      {/* Pulsing ring for active states */}
      {(isListening || assistantState === 'speaking') && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full",
            isListening ? "bg-green-500" : "bg-orange-500"
          )}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        />
      )}

      {getIcon()}

      {/* Unread badge */}
      {unreadCount && unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.div>
      )}
    </motion.button>
  );
}

export default function VoiceChatAssistant(props: VoiceChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    messages,
    assistantState,
    voiceState,
    isVoiceSupported,
    pendingConfirmation,
    processUserMessage,
    startListening,
    stopListening,
    speak,
    confirmAction,
    cancelAction,
  } = useVoiceAssistant(props);

  // Don't auto-start - but keep listening when chat is open
  useEffect(() => {
    if (isVoiceSupported && isOpen && !voiceState.isListening) {
      // Start listening for wake word when chat is open
      const timer = setTimeout(() => {
        startListening(false); // Listen for wake word
      }, 500);
      return () => clearTimeout(timer);
    } else if (!isOpen && voiceState.isListening) {
      // Stop listening when chat is closed
      stopListening();
    }
  }, [isOpen, isVoiceSupported, voiceState.isListening, startListening, stopListening]);

  // Open chat when wake word detected
  useEffect(() => {
    if (voiceState.isListening && !voiceState.isWakeWordActive) {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [voiceState.isListening, voiceState.isWakeWordActive]);

  const handleToggleChat = () => {
    if (isOpen) {
      if (isMinimized) {
        setIsMinimized(false);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleToggleVoice = () => {
    if (voiceState.isListening) {
      stopListening();
    } else {
      // Skip wake word mode when mic button is clicked manually
      startListening(true);
    }
  };

  const handleSendMessage = async (message: string) => {
    await processUserMessage(message, false);
  };

  return (
    <>
      {/* Toggle Button - always visible when chat is closed or minimized */}
      <AnimatePresence>
        {(!isOpen || isMinimized) && (
          <ToggleButton
            onClick={handleToggleChat}
            assistantState={assistantState}
            isListening={voiceState.isListening}
            isVoiceSupported={isVoiceSupported}
            unreadCount={isMinimized ? messages.filter(m => m.role === 'assistant').length : undefined}
          />
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <ChatPanel
            messages={messages}
            assistantState={assistantState}
            isMinimized={isMinimized}
            onSendMessage={handleSendMessage}
            onToggleVoice={handleToggleVoice}
            onMinimize={handleMinimize}
            onClose={handleClose}
            voiceState={voiceState}
            isVoiceSupported={isVoiceSupported}
          />
        )}
      </AnimatePresence>

      {/* Pending Confirmation Dialog */}
      <AnimatePresence>
        {pendingConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
            onClick={cancelAction}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Confirm Action
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {pendingConfirmation.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelAction}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
