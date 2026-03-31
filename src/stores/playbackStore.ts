import { create } from 'zustand';
import type { AgentEvent } from '../../shared/types';
import { fetchHistory } from '../lib/api';

interface PlaybackState {
  isPlaying: boolean;
  speed: number;
  currentIndex: number;
  historyEvents: AgentEvent[];
  visibleFiles: Set<string>;

  loadHistory: (repoPath: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: number) => void;
  seekTo: (index: number) => void;
  reset: () => void;
  tick: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  isPlaying: false,
  speed: 1,
  currentIndex: 0,
  historyEvents: [],
  visibleFiles: new Set(),

  loadHistory: async (repoPath) => {
    try {
      const events = await fetchHistory(repoPath);
      set({ historyEvents: events, currentIndex: 0, visibleFiles: new Set() });
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  },

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setSpeed: (speed) => set({ speed }),

  seekTo: (index) => {
    const { historyEvents } = get();
    const clamped = Math.max(0, Math.min(index, historyEvents.length - 1));
    const visibleFiles = new Set<string>();
    for (let i = 0; i <= clamped; i++) {
      const fp = historyEvents[i]?.filePath;
      if (fp) visibleFiles.add(fp);
    }
    set({ currentIndex: clamped, visibleFiles });
  },

  reset: () => set({ currentIndex: 0, isPlaying: false, visibleFiles: new Set() }),

  tick: () => {
    const { currentIndex, historyEvents, visibleFiles } = get();
    if (currentIndex >= historyEvents.length - 1) {
      set({ isPlaying: false });
      return;
    }
    const next = currentIndex + 1;
    const fp = historyEvents[next]?.filePath;
    const newVisible = new Set(visibleFiles);
    if (fp) newVisible.add(fp);
    set({ currentIndex: next, visibleFiles: newVisible });
  },
}));
