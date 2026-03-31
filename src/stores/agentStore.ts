import { create } from 'zustand';
import type { AgentEvent } from '../../shared/types';

const MAX_EVENTS = 1000;

export interface ActiveAgent {
  agentId: string;
  agentType: string;
  sessionId: string;
  lastEvent: AgentEvent;
  prevEvent?: AgentEvent;
  lastChangeTime: number;
}

interface AgentState {
  events: AgentEvent[];
  addEvent: (event: AgentEvent) => void;
  addEvents: (events: AgentEvent[]) => void;
  clearEvents: () => void;
  cleanupStale: (maxAgeMs?: number) => void;
  activeAgents: Map<string, ActiveAgent>;
}

export const useAgentStore = create<AgentState>((set) => ({
  events: [],
  activeAgents: new Map(),

  addEvent: (event) =>
    set((state) => {
      const events = [...state.events, event].slice(-MAX_EVENTS);
      const activeAgents = new Map(state.activeAgents);
      const existing = activeAgents.get(event.agentId);
      activeAgents.set(event.agentId, {
        agentId: event.agentId,
        agentType: event.agentType,
        sessionId: event.sessionId,
        lastEvent: event,
        prevEvent: existing?.lastEvent,
        lastChangeTime: Date.now(),
      });
      return { events, activeAgents };
    }),

  addEvents: (newEvents) =>
    set((state) => {
      const events = [...state.events, ...newEvents].slice(-MAX_EVENTS);
      const activeAgents = new Map(state.activeAgents);
      for (const event of newEvents) {
        const existing = activeAgents.get(event.agentId);
        activeAgents.set(event.agentId, {
          agentId: event.agentId,
          agentType: event.agentType,
          sessionId: event.sessionId,
          lastEvent: event,
          prevEvent: existing?.lastEvent,
          lastChangeTime: Date.now(),
        });
      }
      return { events, activeAgents };
    }),

  clearEvents: () => set({ events: [], activeAgents: new Map() }),

  // Remove agents that haven't been active for a while
  cleanupStale: (maxAgeMs = 30000) =>
    set((state) => {
      const now = Date.now();
      let changed = false;
      const activeAgents = new Map(state.activeAgents);
      for (const [key, agent] of activeAgents) {
        if (now - agent.lastChangeTime > maxAgeMs) {
          activeAgents.delete(key);
          changed = true;
        }
      }
      return changed ? { activeAgents } : {};
    }),
}));
