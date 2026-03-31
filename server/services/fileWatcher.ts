import { open, stat as fsStat, readFile } from 'fs/promises';
import { statSync } from 'fs';
import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';
import { getProjectDir } from './claudePaths.js';
import { parseJsonlLine } from './jsonlParser.js';
import type { AgentEvent } from '../../shared/types.js';

const offsets = new Map<string, number>();
let watcher: FSWatcher | null = null;

const agentMetaCache = new Map<string, { agentId: string; agentType: string }>();

async function extractAgentInfo(filePath: string): Promise<{ agentId: string; agentType: string }> {
  if (agentMetaCache.has(filePath)) return agentMetaCache.get(filePath)!;

  const normalized = filePath.replace(/\\/g, '/');
  const subagentMatch = normalized.match(/subagents\/(agent-[^/]+)\.jsonl$/);
  if (!subagentMatch) {
    const info = { agentId: 'main', agentType: 'main' };
    agentMetaCache.set(filePath, info);
    return info;
  }

  const agentId = subagentMatch[1];
  let agentType = 'subagent';

  // Try to read meta.json for richer type info
  const metaPath = filePath.replace(/\.jsonl$/, '.meta.json');
  try {
    const meta = JSON.parse(await readFile(metaPath, 'utf-8'));
    if (meta.agentType) agentType = meta.agentType;
    if (meta.description) agentType = `${meta.agentType || 'agent'}`;
  } catch { /* no meta file */ }

  const info = { agentId, agentType };
  agentMetaCache.set(filePath, info);
  return info;
}

async function readNewLines(filePath: string, onEvent: (event: AgentEvent) => void): Promise<void> {
  const currentOffset = offsets.get(filePath) ?? 0;
  const { agentId, agentType } = await extractAgentInfo(filePath);

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

  // Track which files existed before watcher was ready
  const preExisting = new Set<string>();
  let isReady = false;

  watcher.on('add', (filePath: string) => {
    if (!filePath.endsWith('.jsonl')) return;
    const isSubagent = filePath.replace(/\\/g, '/').includes('/subagents/');
    console.log('[FileWatcher] File detected:', isSubagent ? '[subagent]' : '[main]', filePath.slice(-60));

    if (!isReady) {
      // Pre-existing file: skip to end (only watch for new content)
      preExisting.add(filePath);
      try {
        const s = statSync(filePath);
        offsets.set(filePath, s.size);
      } catch {
        offsets.set(filePath, 0);
      }
    } else {
      // Newly created file (e.g., new background agent): read from beginning
      offsets.set(filePath, 0);
      void readNewLines(filePath, onEvent);
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
    isReady = true;
    console.log(`[FileWatcher] Ready. Tracking ${preExisting.size} existing files, watching for new ones`);
  });
}

export function stopWatching(): void {
  if (watcher) {
    void watcher.close();
    watcher = null;
    offsets.clear();
    agentMetaCache.clear();
  }
}
