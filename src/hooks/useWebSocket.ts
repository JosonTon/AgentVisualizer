import { useEffect, useRef, useState } from 'react';
import type { AgentEvent, WsMessage } from '../../shared/types';
import { useAgentStore } from '../stores/agentStore';
import { useRepoStore } from '../stores/repoStore';

export function useWebSocket() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const addEvent = useAgentStore((s) => s.addEvent);
  const addEvents = useAgentStore((s) => s.addEvents);
  const cleanupStale = useAgentStore((s) => s.cleanupStale);
  const repoPath = useRepoStore((s) => s.repoPath);
  const loadFileTree = useRepoStore((s) => s.loadFileTree);

  useEffect(() => {
    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${location.host}/ws`);
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => setStatus('connected');

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WsMessage;
          switch (msg.type) {
            case 'agent_event':
              addEvent(msg.data as AgentEvent);
              break;
            case 'initial_events':
              addEvents(msg.data as AgentEvent[]);
              break;
            case 'tree_changed':
              if (repoPath) void loadFileTree(repoPath);
              break;
            case 'session_started':
            case 'session_ended':
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;
        reconnectTimer.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    // Periodically clean up stale agents (inactive > 30s)
    const cleanupInterval = setInterval(() => cleanupStale(30000), 5000);

    return () => {
      clearTimeout(reconnectTimer.current);
      clearInterval(cleanupInterval);
      wsRef.current?.close();
    };
  }, [addEvent, addEvents, cleanupStale, repoPath, loadFileTree]);

  return status;
}
