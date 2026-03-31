import { useRepoStore } from './stores/repoStore';
import { useAgentStore } from './stores/agentStore';
import { usePlaybackStore } from './stores/playbackStore';
import { useWebSocket } from './hooks/useWebSocket';
import { stopWatching } from './lib/api';
import { RepoSelector } from './components/repo/RepoSelector';
import { CityScene } from './components/city/CityScene';
import { DashboardPanel } from './components/dashboard/DashboardPanel';
import { PlaybackControls } from './components/playback/PlaybackControls';

function AppContent() {
  const fileTree = useRepoStore((s) => s.fileTree);
  const repoPath = useRepoStore((s) => s.repoPath);
  const resetRepo = useRepoStore((s) => s.reset);
  const clearEvents = useAgentStore((s) => s.clearEvents);
  const historyCount = usePlaybackStore((s) => s.historyEvents.length);
  const wsStatus = useWebSocket();

  const handleBack = () => {
    void stopWatching();
    clearEvents();
    resetRepo();
  };

  if (!fileTree) {
    return <RepoSelector />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: 'var(--bg-void)',
    }}>
      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* 3D Scene */}
        <div style={{ flex: 1, position: 'relative' }}>
          <CityScene />
          {/* Top bar: back button + repo path + WS status */}
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            pointerEvents: 'none',
          }}>
            <button
              onClick={handleBack}
              className="font-display"
              style={{
                pointerEvents: 'auto',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--text-secondary)',
                padding: '4px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                letterSpacing: 1,
              }}
            >
              ← BACK
            </button>
            <span className="font-mono" style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {repoPath}
            </span>
            <div
              className="ws-status-pill"
              style={{ marginLeft: 'auto', pointerEvents: 'auto' }}
            >
              <div
                className="signal-dot"
                style={{
                  background: wsStatus === 'connected' ? 'var(--accent-lime)'
                    : wsStatus === 'connecting' ? 'var(--accent-gold)'
                    : 'var(--accent-coral)',
                  boxShadow: wsStatus === 'connected'
                    ? '0 0 6px var(--accent-lime)'
                    : wsStatus === 'connecting'
                    ? '0 0 6px var(--accent-gold)'
                    : '0 0 6px var(--accent-coral)',
                }}
              />
              {wsStatus}
            </div>
          </div>
        </div>

        {/* Animated gradient border line between city and dashboard */}
        <div style={{
          width: 1,
          background: 'linear-gradient(180deg, var(--accent-cyan), var(--accent-magenta), var(--accent-gold), var(--accent-cyan))',
          backgroundSize: '100% 200%',
          animation: 'gradient-shift 4s linear infinite',
        }} />

        {/* Dashboard */}
        <DashboardPanel />
      </div>

      {/* Playback bar */}
      {historyCount > 0 && <PlaybackControls />}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
