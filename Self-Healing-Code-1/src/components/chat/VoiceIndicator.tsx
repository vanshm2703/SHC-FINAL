'use client';

import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

interface VoiceIndicatorProps {
  transcript: string;
  interimTranscript: string;
  isWakeWordMode?: boolean;
}

export function VoiceIndicator({ transcript, interimTranscript, isWakeWordMode = false }: VoiceIndicatorProps) {
  const displayText = interimTranscript || transcript;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-t border-green-200 dark:border-green-800"
    >
      <div className="flex items-center gap-3">
        {/* Animated sound bars */}
        <div className="flex items-end gap-0.5 h-6">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-green-500 rounded-full"
              animate={{
                height: [6, 20, 10, 16, 6],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {isWakeWordMode ? 'Say "Hey SHC" to activate...' : 'Listening... Speak now!'}
          </span>
        </div>
      </div>

      {/* Live transcript preview */}
      {displayText && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic bg-white/50 dark:bg-gray-800/50 rounded-lg px-3 py-2"
        >
          &ldquo;{displayText}&rdquo;
        </motion.p>
      )}

      {/* Hint for active mode */}
      {!isWakeWordMode && !displayText && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          className="text-xs text-gray-500 dark:text-gray-400 mt-2"
        >
          Speak your question... (will send after 2s of silence)
        </motion.p>
      )}
    </motion.div>
  );
}
