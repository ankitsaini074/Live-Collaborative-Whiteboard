import { useEffect, useRef } from 'react';
import { useUIStore } from '../store/uiStore';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '🔥', '👀', '🎉', '💡', '✅'];

interface EmojiReactionsPanelProps {
  onSendReaction: (emoji: string) => void;
  darkMode: boolean;
}

export function EmojiReactionsPanel({ onSendReaction, darkMode }: EmojiReactionsPanelProps) {
  return (
    <div className={`flex items-center gap-1 p-1.5 rounded-xl shadow-lg border ${
      darkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-100'
    }`}>
      {EMOJI_OPTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSendReaction(emoji)}
          className="w-8 h-8 text-base rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-all hover:scale-125 active:scale-95"
          title={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function EmojiReactionsOverlay() {
  const { emojiReactions, removeEmojiReaction } = useUIStore();
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    emojiReactions.forEach((reaction) => {
      if (!timers.current.has(reaction.id)) {
        const timer = setTimeout(() => {
          removeEmojiReaction(reaction.id);
          timers.current.delete(reaction.id);
        }, 3000);
        timers.current.set(reaction.id, timer);
      }
    });
  }, [emojiReactions, removeEmojiReaction]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {emojiReactions.map((reaction) => (
        <EmojiFloat key={reaction.id} reaction={reaction} />
      ))}
    </div>
  );
}

function EmojiFloat({ reaction }: { reaction: { id: string; emoji: string; x: number; y: number; username: string; color: string; createdAt: number } }) {
  const age = Date.now() - reaction.createdAt;
  const opacity = Math.max(0, 1 - age / 3000);

  return (
    <div
      className="absolute flex flex-col items-center gap-1 animate-bounce-up"
      style={{
        left: `${reaction.x}px`,
        top: `${reaction.y}px`,
        transform: 'translate(-50%, -50%)',
        animation: 'float-up 3s ease-out forwards',
      }}
    >
      <div className="text-3xl drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
        {reaction.emoji}
      </div>
      <div
        className="text-xs font-semibold px-2 py-0.5 rounded-full text-white whitespace-nowrap shadow"
        style={{ backgroundColor: reaction.color }}
      >
        {reaction.username}
      </div>
    </div>
  );
}
