'use client';

import { AssistantState } from '@/lib/chatTypes';
import { cn } from '@/lib/utils';
import { X, Minus, Bot, Mic, Brain, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
  state: AssistantState;
  onMinimize: () => void;
  onClose: () => void;
}

const stateConfig: Record<AssistantState, { icon: React.ElementType; label: string; color: string }> = {
  idle: { icon: Bot, label: 'Ready', color: 'text-green-500' },
  listening: { icon: Mic, label: 'Listening...', color: 'text-blue-500' },
  thinking: { icon: Brain, label: 'Thinking...', color: 'text-purple-500' },
  speaking: { icon: Volume2, label: 'Speaking...', color: 'text-orange-500' },
};

export function ChatHeader({ state, onMinimize, onClose }: ChatHeaderProps) {
  const { icon: StateIcon, label, color } = stateConfig[state];

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-2xl">
      {/* Logo and Status */}
      <div className="flex items-center gap-3">
        {/* SHC Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg font-bold">SHC</span>
          </div>
          {/* Status indicator dot */}
          <motion.div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
              state === 'idle' && "bg-green-400",
              state === 'listening' && "bg-blue-400",
              state === 'thinking' && "bg-purple-400",
              state === 'speaking' && "bg-orange-400"
            )}
            animate={state !== 'idle' ? {
              scale: [1, 1.2, 1],
            } : {}}
            transition={{
              duration: 1,
              repeat: state !== 'idle' ? Infinity : 0,
            }}
          />
        </div>

        {/* Status text */}
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Self-Healing Code</span>
          <div className="flex items-center gap-1.5">
            <StateIcon className={cn("w-3 h-3", color.replace('text-', 'text-white/'))} />
            <span className="text-xs text-white/80">{label}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onMinimize}
          className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
