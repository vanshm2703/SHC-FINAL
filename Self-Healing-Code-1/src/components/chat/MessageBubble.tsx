'use client';

import { motion } from 'framer-motion';
import { ChatMessage } from '@/lib/chatTypes';
import { cn } from '@/lib/utils';
import { Mic } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  onSuggestionClick?: (suggestion: string) => void;
}

export function MessageBubble({ message, onSuggestionClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
          isUser
            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-md"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
        )}
      >
        {/* Voice input indicator */}
        {message.metadata?.voiceInput && (
          <span className="inline-flex items-center mr-1.5 opacity-70">
            <Mic className="w-3 h-3" />
          </span>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap leading-relaxed inline">
          {message.content}
        </p>

        {/* Points awarded indicator */}
        {message.metadata?.pointsAwarded && message.metadata.pointsAwarded > 0 && (
          <div className={cn(
            "mt-2 text-xs font-medium flex items-center gap-1",
            isUser ? "text-white/80" : "text-green-600 dark:text-green-400"
          )}>
            <span>+{message.metadata.pointsAwarded} points</span>
          </div>
        )}

        {/* Suggested follow-ups (only for assistant messages) */}
        {!isUser && message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.suggestedFollowUps.slice(0, 3).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="text-xs bg-white/10 dark:bg-white/5 border border-gray-200 dark:border-gray-700
                         px-2.5 py-1 rounded-full hover:bg-white/20 dark:hover:bg-white/10
                         transition-colors text-gray-700 dark:text-gray-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(
          "text-[10px] mt-1.5",
          isUser ? "text-white/60 text-right" : "text-gray-400 dark:text-gray-500"
        )}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </motion.div>
  );
}
