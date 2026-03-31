const SESSION_PALETTE = [
  '#00d4ff', '#ff00ff', '#00ff88', '#ffd700',
  '#ff3b5c', '#bf5af2', '#ff6b35', '#3b82f6',
];

const cache = new Map<string, { color: string; index: number }>();
let nextIndex = 0;

export function getSessionColor(sessionId: string): string {
  return getSessionInfo(sessionId).color;
}

export function getSessionIndex(sessionId: string): number {
  return getSessionInfo(sessionId).index;
}

function getSessionInfo(sessionId: string) {
  if (cache.has(sessionId)) return cache.get(sessionId)!;
  const index = nextIndex++;
  const color = SESSION_PALETTE[index % SESSION_PALETTE.length];
  const info = { color, index: index + 1 };
  cache.set(sessionId, info);
  return info;
}
