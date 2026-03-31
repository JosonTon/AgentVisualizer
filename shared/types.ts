export interface AgentEvent {
  id: string;
  timestamp: number;
  sessionId: string;
  agentId: string;
  agentType: string;
  toolName: string;
  filePath?: string;
  operation: 'read' | 'write' | 'create' | 'edit' | 'search' | 'execute';
  summary?: string;
}

export interface SessionInfo {
  sessionId: string;
  pid: number;
  cwd: string;
  startedAt: number;
  kind: string;
  entrypoint: string;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileNode[];
}

export interface WsMessage {
  type: 'agent_event' | 'session_started' | 'session_ended' | 'initial_events' | 'tree_changed';
  data: unknown;
}
