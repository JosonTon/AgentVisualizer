import { Activity, List } from 'lucide-react';
import { AgentList } from './AgentList';
import { EventLog } from './EventLog';
import { useRepoStore } from '../../stores/repoStore';
import { useAgentStore } from '../../stores/agentStore';

export function DashboardPanel() {
  const repoPath = useRepoStore((s) => s.repoPath);
  const eventCount = useAgentStore((s) => s.events.length);

  return (
    <div
      className="glass-panel"
      style={{
        width: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Animated gradient left border */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 2,
        height: '100%',
        background: 'linear-gradient(180deg, var(--accent-cyan), var(--accent-magenta), var(--accent-cyan))',
        backgroundSize: '100% 200%',
        animation: 'gradient-shift 4s linear infinite',
      }} />

      {/* Scan-line overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.01) 2px, rgba(0, 212, 255, 0.01) 4px)',
      }} />

      {/* Header */}
      <div style={{
        padding: '14px 16px 14px 18px',
        borderBottom: '1px solid var(--border-glow)',
        position: 'relative',
        zIndex: 2,
      }}>
        <div className="mono" style={{
          fontSize: 11,
          color: 'var(--text-dim)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {repoPath}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Active Agents Section */}
        <div style={{ padding: '12px 16px 8px 18px' }}>
          <div className="section-header" style={{ marginBottom: 10 }}>
            <Activity size={12} />
            Active Agents
          </div>
          <AgentList />
        </div>

        {/* Divider */}
        <div style={{
          height: 1,
          background: 'linear-gradient(90deg, var(--border-glow), transparent)',
          margin: '8px 16px',
        }} />

        {/* Event Log Section */}
        <div style={{ padding: '8px 16px 16px 18px', flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <div className="section-header">
              <List size={12} />
              Event Log
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {eventCount}
            </span>
          </div>
          <EventLog />
        </div>
      </div>
    </div>
  );
}
