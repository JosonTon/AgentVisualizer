import { useAgentStore } from '../../stores/agentStore';
import { getToolColor } from '../city/AgentBeam';
import { getSessionColor, getSessionIndex } from '../../lib/sessionColors';

const OP_LABELS: Record<string, string> = {
  read: 'Reading',
  write: 'Writing',
  create: 'Creating',
  edit: 'Editing',
  search: 'Searching',
  execute: 'Executing',
};

export function AgentList() {
  const activeAgents = useAgentStore((s) => s.activeAgents);
  const agents = Array.from(activeAgents.values());

  if (agents.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>
        No active agents
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {agents.map((agent) => {
        const color = getToolColor(agent.lastEvent.toolName);
        const sessionColor = getSessionColor(agent.sessionId);
        const sessionIdx = getSessionIndex(agent.sessionId);
        const ev = agent.lastEvent;
        const timeSince = Math.round((Date.now() - agent.lastChangeTime) / 1000);
        return (
          <div
            key={agent.agentId}
            className="holo-card"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div
              className="signal-dot"
              style={{
                background: color,
                boxShadow: `0 0 6px ${color}`,
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  className="font-display"
                  style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: 1 }}
                >
                  {agent.agentType === 'main' ? 'MAIN' : agent.agentType.toUpperCase()}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    padding: '1px 4px',
                    borderRadius: 2,
                    background: sessionColor,
                    color: '#050510',
                    fontWeight: 700,
                  }}
                >
                  S{sessionIdx}
                </span>
                <span className="mono" style={{ fontSize: 9, color: 'var(--text-dim)', marginLeft: 'auto' }}>
                  {timeSince}s ago
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                {OP_LABELS[ev.operation] ?? ev.operation} &middot; {ev.toolName}
              </div>
              {ev.filePath && (
                <div className="mono" style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  marginTop: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  direction: 'rtl',
                  textAlign: 'left',
                }}>
                  {ev.filePath}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
