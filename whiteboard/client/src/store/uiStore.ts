import { create } from 'zustand';

interface UIState {
  darkMode: boolean;
  showVideoPanel: boolean;
  showInviteModal: boolean;
  showShortcuts: boolean;
  showClearConfirm: boolean;
  emojiReactions: EmojiReaction[];
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
  toggleVideoPanel: () => void;
  setShowInviteModal: (val: boolean) => void;
  setShowShortcuts: (val: boolean) => void;
  setShowClearConfirm: (val: boolean) => void;
  addEmojiReaction: (reaction: Omit<EmojiReaction, 'id' | 'createdAt'>) => void;
  removeEmojiReaction: (id: string) => void;
}

export interface EmojiReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
  username: string;
  color: string;
  createdAt: number;
}

const getInitialDarkMode = () => {
  try {
    const stored = localStorage.getItem('wb_dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

const applyDarkMode = (dark: boolean) => {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const initialDark = getInitialDarkMode();
applyDarkMode(initialDark);

export const useUIStore = create<UIState>((set) => ({
  darkMode: initialDark,
  showVideoPanel: false,
  showInviteModal: false,
  showShortcuts: false,
  showClearConfirm: false,
  emojiReactions: [],

  toggleDarkMode: () => set((state) => {
    const next = !state.darkMode;
    applyDarkMode(next);
    try { localStorage.setItem('wb_dark_mode', String(next)); } catch {}
    return { darkMode: next };
  }),

  setDarkMode: (val) => set(() => {
    applyDarkMode(val);
    try { localStorage.setItem('wb_dark_mode', String(val)); } catch {}
    return { darkMode: val };
  }),

  toggleVideoPanel: () => set((state) => ({ showVideoPanel: !state.showVideoPanel })),
  setShowInviteModal: (val) => set({ showInviteModal: val }),
  setShowShortcuts: (val) => set({ showShortcuts: val }),
  setShowClearConfirm: (val) => set({ showClearConfirm: val }),

  addEmojiReaction: (reaction) => set((state) => {
    const id = crypto.randomUUID();
    const newReaction: EmojiReaction = { ...reaction, id, createdAt: Date.now() };
    return { emojiReactions: [...state.emojiReactions, newReaction] };
  }),

  removeEmojiReaction: (id) => set((state) => ({
    emojiReactions: state.emojiReactions.filter((r) => r.id !== id),
  })),
}));
