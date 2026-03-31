import { readFile } from 'fs/promises';
import type { AgentEvent } from '../../shared/types.js';

interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface JsonlEntry {
  uuid: string;
  type: string;
  timestamp: string;
  sessionId: string;
  message?: {
    role: string;
    content: unknown[];
  };
}

function mapToolToOperation(toolName: string): AgentEvent['operation'] {
  switch (toolName) {
    case 'Read':
    case 'Glob':
    case 'Grep':
      return 'read';
    case 'Write':
      return 'create';
    case 'Edit':
      return 'edit';
    case 'Bash':
      return 'execute';
    case 'Search':
    case 'WebSearch':
    case 'WebFetch':
      return 'search';
    default:
      return 'execute';
  }
}

function extractFilePath(input: Record<string, unknown>): string | undefined {
  const raw = typeof input.file_path === 'string' ? input.file_path
    : typeof input.path === 'string' ? input.path
    : undefined;
  if (!raw) return undefined;
  // Normalize to forward slashes to match file tree paths
  return raw.replace(/\\/g, '/');
}

function buildSummary(toolName: string, input: Record<string, unknown>): string {
  const parts: string[] = [toolName];
  if (input.file_path) parts.push(String(input.file_path));
  else if (input.path) parts.push(String(input.path));
  if (input.command) parts.push(String(input.command).slice(0, 120));
  if (input.pattern) parts.push(`pattern: ${input.pattern}`);
  if (input.query) parts.push(`query: ${input.query}`);
  return parts.join(' ');
}

export function parseJsonlLine(line: string, agentId = 'main', agentType = 'main'): AgentEvent[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  let entry: JsonlEntry;
  try {
    entry = JSON.parse(trimmed) as JsonlEntry;
  } catch {
    return [];
  }

  if (entry.type !== 'assistant') return [];
  if (!entry.message?.content || !Array.isArray(entry.message.content)) return [];

  const events: AgentEvent[] = [];

  entry.message.content.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) return;
    const content = item as Record<string, unknown>;
    if (content.type !== 'tool_use') return;

    const toolUse = content as unknown as ToolUseContent;
    const input = toolUse.input ?? {};

    // Use sessionId:agentId as unique key so different sessions don't collide
    const uniqueAgentId = `${entry.sessionId.slice(0, 8)}:${agentId}`;
    events.push({
      id: `${entry.uuid}-${index}`,
      timestamp: new Date(entry.timestamp).getTime(),
      sessionId: entry.sessionId,
      agentId: uniqueAgentId,
      agentType,
      toolName: toolUse.name,
      filePath: extractFilePath(input),
      operation: mapToolToOperation(toolUse.name),
      summary: buildSummary(toolUse.name, input),
    });
  });

  return events;
}

export async function parseJsonlFile(filePath: string): Promise<AgentEvent[]> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch {
    return [];
  }

  const events: AgentEvent[] = [];
  for (const line of content.split('\n')) {
    events.push(...parseJsonlLine(line));
  }
  return events;
}
