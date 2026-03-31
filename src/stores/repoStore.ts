import { create } from 'zustand';
import type { FileNode, SessionInfo } from '../../shared/types';
import { fetchRepoTree, fetchSessions } from '../lib/api';

interface RepoState {
  repoPath: string;
  setRepoPath: (path: string) => void;
  fileTree: FileNode | null;
  loadFileTree: (path: string) => Promise<void>;
  sessions: SessionInfo[];
  loadSessions: (path: string) => Promise<void>;
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
  reset: () => void;
}

export const useRepoStore = create<RepoState>((set) => ({
  repoPath: '',
  setRepoPath: (path) => set({ repoPath: path }),

  fileTree: null,
  loadFileTree: async (path) => {
    try {
      const tree = await fetchRepoTree(path);
      set({ fileTree: tree });
    } catch (err) {
      console.error('Failed to load file tree:', err);
    }
  },

  sessions: [],
  loadSessions: async (path) => {
    try {
      const sessions = await fetchSessions(path);
      set({ sessions });
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  },

  activeSessionId: null,
  setActiveSession: (id) => set({ activeSessionId: id }),

  reset: () => set({ repoPath: '', fileTree: null, sessions: [], activeSessionId: null }),
}));
