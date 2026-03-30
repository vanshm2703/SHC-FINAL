'use client';

import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MicButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function MicButton({ isListening, isSupported, onClick, disabled }: MicButtonProps) {
  if (!isSupported) {
    return (
      <button
        disabled
        className="p-2.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
        title="Voice input not supported in this browser"
      >
        <MicOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative p-2.5 rounded-full transition-colors",
        isListening
          ? "bg-red-500 hover:bg-red-600 text-white"
          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      whileTap={{ scale: 0.95 }}
      title={isListening ? "Stop listening" : "Start voice input"}
    >
      {/* Pulsing ring when listening */}
      {isListening && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 0.3,
              ease: "easeInOut",
            }}
          />
        </>
      )}

      <Mic className="w-5 h-5 relative z-10" />
    </motion.button>
  );
}
