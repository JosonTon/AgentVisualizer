// Tool color mapping — used by AgentCallout, AgentList, and CityRenderer

const TOOL_COLORS: Record<string, string> = {
  Read: '#3b82f6',
  Write: '#ef4444',
  Edit: '#f59e0b',
  Bash: '#10b981',
  Glob: '#8b5cf6',
  Grep: '#06b6d4',
  Search: '#a855f7',
  WebSearch: '#ec4899',
  WebFetch: '#e879f9',
  Agent: '#ff6b35',
};

const DEFAULT_TOOL_COLOR = '#ff6b35';

export function getToolColor(toolName: string): string {
  return TOOL_COLORS[toolName] ?? DEFAULT_TOOL_COLOR;
}
