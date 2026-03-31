import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import type { SessionInfo, AgentEvent } from '../../shared/types.js';
import { getSessionsDir, getProjectDir } from './claudePaths.js';
import { parseJsonlFile } from './jsonlParser.js';

function pathsMatch(a: string, b: string): boolean {
  const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const na = normalize(a);
  const nb = normalize(b);
  if (process.platform === 'win32') {
    return na.toLowerCase() === nb.toLowerCase();
  }
  return na === nb;
}

export async function discoverSessions(repoPath: string): Promise<SessionInfo[]> {
  const sessions = new Map<string, SessionInfo>();

  // 1. Scan ~/.claude/sessions/ for pid.json files
  const sessionsDir = getSessionsDir();
  try {
    const files = await readdir(sessionsDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await readFile(join(sessionsDir, file), 'utf-8');
        const data = JSON.parse(raw) as Record<string, unknown>;
        if (typeof data.cwd === 'string' && pathsMatch(data.cwd, repoPath)) {
          const info: SessionInfo = {
            sessionId: String(data.sessionId ?? ''),
            pid: Number(data.pid ?? 0),
            cwd: String(data.cwd ?? ''),
            startedAt: Number(data.startedAt ?? 0),
            kind: String(data.kind ?? ''),
            entrypoint: String(data.entrypoint ?? ''),
          };
          if (info.sessionId) {
            sessions.set(info.sessionId, info);
          }
        }
      } catch {
        // skip malformed files
      }
    }
  } catch {
    // sessions dir doesn't exist
  }

  // 2. Scan project directory for .jsonl files
  const projectDir = getProjectDir(repoPath);
  try {
    const files = await readdir(projectDir);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const sessionId = basename(file, '.jsonl');
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          sessionId,
          pid: 0,
          cwd: repoPath,
          startedAt: 0,
          kind: 'unknown',
          entrypoint: '',
        });
      }
    }
  } catch {
    // project dir doesn't exist
  }

  return Array.from(sessions.values());
}

export async function getSessionEvents(repoPath: string, sessionId: string): Promise<AgentEvent[]> {
  const projectDir = getProjectDir(repoPath);
  const allEvents: AgentEvent[] = [];

  // Parse main session JSONL
  const mainFile = join(projectDir, `${sessionId}.jsonl`);
  allEvents.push(...await parseJsonlFile(mainFile));

  // Parse subagent JSONLs
  const subagentsDir = join(projectDir, sessionId, 'subagents');
  try {
    const files = await readdir(subagentsDir);
    for (const file of files) {
      if (!file.endsWith('.jsonl')) continue;
      const events = await parseJsonlFile(join(subagentsDir, file));
      allEvents.push(...events);
    }
  } catch {
    // no subagents directory
  }

  // Sort by timestamp
  allEvents.sort((a, b) => a.timestamp - b.timestamp);
  return allEvents;
}
