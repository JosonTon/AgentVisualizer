import { useEffect, useRef } from 'react';
import { FileCode, Terminal, Search, Eye, Edit3, Zap } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';

const OP_ICONS: Record<string, typeof FileCode> = {
  read: Eye,
  write: Edit3,
  create: FileCode,
  edit: Edit3,
  search: Search,
  execute: Terminal,
};

const OP_COLORS: Record<string, string> = {
  read: '#4ecdc4',
  write: '#ff6b6b',
  create: '#95e86b',
  edit: '#ffd93d',
  search: '#6bcaff',
  execute: '#c39bff',
};

export function EventLog() {
  const events = useAgentStore((s) => s.events);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = events.slice(-50);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible.length]);

  if (visible.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>
        No events yet
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        maxHeight: 400,
        overflowY: 'auto',
      }}
    >
      {visible.map((ev) => {
        const Icon = OP_ICONS[ev.operation] ?? Zap;
        const color = OP_COLORS[ev.operation] ?? '#888';
        const time = new Date(ev.timestamp).toLocaleTimeString();
        return (
          <div
            key={ev.id}
            className="event-row"
            style={{
              borderLeft: `2px solid ${color}`,
              paddingLeft: 10,
            }}
          >
            <Icon size={13} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ color, fontWeight: 500, textShadow: `0 0 8px ${color}40` }}>
                  {ev.toolName}
                </span>
                <span className="mono" style={{ color: 'rgba(0, 212, 255, 0.4)', fontSize: 10 }}>
                  {time}
                </span>
              </div>
              {ev.filePath && (
                <div className="mono" style={{
                  color: 'var(--text-dim)',
                  fontSize: 10,
                  marginTop: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {ev.filePath}
                </div>
              )}
              {ev.summary && (
                <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 1 }}>
                  {ev.summary}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
