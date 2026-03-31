import type { FileNode, SessionInfo, AgentEvent } from '../../shared/types';

const BASE = '/api';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function fetchRepoTree(path: string): Promise<FileNode> {
  return json<FileNode>(`${BASE}/repo/tree?path=${encodeURIComponent(path)}`);
}

export function fetchSessions(repoPath: string): Promise<SessionInfo[]> {
  return json<SessionInfo[]>(`${BASE}/sessions?repoPath=${encodeURIComponent(repoPath)}`);
}

export function fetchSessionEvents(repoPath: string, sessionId: string): Promise<AgentEvent[]> {
  return json<AgentEvent[]>(
    `${BASE}/sessions/${encodeURIComponent(sessionId)}/events?repoPath=${encodeURIComponent(repoPath)}`,
  );
}

export function fetchHistory(repoPath: string): Promise<AgentEvent[]> {
  return json<AgentEvent[]>(`${BASE}/history?repoPath=${encodeURIComponent(repoPath)}`);
}

export async function startWatching(repoPath: string): Promise<void> {
  await fetch(`${BASE}/watch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath }),
  });
}

export async function stopWatching(): Promise<void> {
  await fetch(`${BASE}/watch/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
