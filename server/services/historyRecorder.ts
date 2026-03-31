import { mkdir, readFile, appendFile } from 'fs/promises';
import { homedir } from 'os';
import { join, basename } from 'path';
import type { AgentEvent } from '../../shared/types.js';

function getHistoryDir(repoPath: string): string {
  const repoName = basename(repoPath.replace(/\\/g, '/').replace(/\/+$/, ''));
  return join(homedir(), '.agent-visualizer', repoName);
}

function getHistoryFile(repoPath: string): string {
  return join(getHistoryDir(repoPath), 'history.jsonl');
}

export async function recordEvent(repoPath: string, event: AgentEvent): Promise<void> {
  const dir = getHistoryDir(repoPath);
  try {
    await mkdir(dir, { recursive: true });
    await appendFile(getHistoryFile(repoPath), JSON.stringify(event) + '\n', 'utf-8');
  } catch {
    // silently fail if we can't write history
  }
}

export async function readHistory(repoPath: string): Promise<AgentEvent[]> {
  const filePath = getHistoryFile(repoPath);
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return [];
  }

  const events: AgentEvent[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as AgentEvent);
    } catch {
      // skip malformed lines
    }
  }
  return events;
}
