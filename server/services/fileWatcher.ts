import { open, stat as fsStat } from 'fs/promises';
import { statSync } from 'fs';
import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { getProjectDir } from './claudePaths.js';
import { parseJsonlLine } from './jsonlParser.js';
import type { AgentEvent } from '../../shared/types.js';

const offsets = new Map<string, number>();
let watcher: FSWatcher | null = null;

function extractAgentInfo(filePath: string): { agentId: string; agentType: string } {
  const normalized = filePath.replace(/\\/g, '/');
  const subagentMatch = normalized.match(/subagents\/(agent-[^/]+)\.jsonl$/);
  if (subagentMatch) {
    return { agentId: subagentMatch[1], agentType: 'subagent' };
  }
  return { agentId: 'main', agentType: 'main' };
}

async function readNewLines(filePath: string, onEvent: (event: AgentEvent) => void): Promise<void> {
  const currentOffset = offsets.get(filePath) ?? 0;
  const { agentId, agentType } = extractAgentInfo(filePath);

  let fh;
  try {
    fh = await open(filePath, 'r');
    const stat = await fh.stat();
    if (stat.size <= currentOffset) {
      await fh.close();
      return;
    }

    const buf = Buffer.alloc(stat.size - currentOffset);
    await fh.read(buf, 0, buf.length, currentOffset);
    await fh.close();

    offsets.set(filePath, stat.size);

    const text = buf.toString('utf-8');
    let eventCount = 0;
    for (const line of text.split('\n')) {
      const events = parseJsonlLine(line, agentId, agentType);
      for (const event of events) {
        eventCount++;
        onEvent(event);
      }
    }
    if (eventCount > 0) {
      console.log(`[FileWatcher] Parsed ${eventCount} events from [${agentId}] ...${filePath.slice(-50)}`);
    }
  } catch {
    if (fh) await fh.close().catch(() => {});
  }
}

export function startWatching(repoPath: string, onEvent: (event: AgentEvent) => void): void {
  stopWatching();

  const projectDir = getProjectDir(repoPath);
  console.log('[FileWatcher] Watching directory:', projectDir);

  // Watch the directory directly (glob patterns don't work reliably on Windows)
  watcher = watch(projectDir, {
    ignoreInitial: false,
    usePolling: true,
    interval: 1500,
  });

  watcher.on('add', (filePath: string) => {
    if (!filePath.endsWith('.jsonl')) return;
    console.log('[FileWatcher] File detected:', filePath.slice(-60));
    // Start from end of file so we only get new events going forward
    try {
      const s = statSync(filePath);
      offsets.set(filePath, s.size);
    } catch {
      offsets.set(filePath, 0);
    }
  });

  watcher.on('change', (filePath: string) => {
    if (!filePath.endsWith('.jsonl')) return;
    console.log('[FileWatcher] File changed:', filePath.slice(-60));
    void readNewLines(filePath, onEvent);
  });

  watcher.on('error', (err: Error) => {
    console.error('[FileWatcher] Error:', err.message);
  });

  watcher.on('ready', () => {
    console.log('[FileWatcher] Ready and watching for changes');
  });
}

export function stopWatching(): void {
  if (watcher) {
    void watcher.close();
    watcher = null;
    offsets.clear();
  }
}
