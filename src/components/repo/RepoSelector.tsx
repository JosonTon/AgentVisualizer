import { useState, useEffect } from 'react';
import { FolderOpen, Clock, X } from 'lucide-react';
import { useRepoStore } from '../../stores/repoStore';
import { startWatching } from '../../lib/api';

const STORAGE_KEY = 'agentvis-recent-repos';

function getRecentRepos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function saveRecentRepo(path: string) {
  const recent = getRecentRepos().filter((r) => r !== path);
  recent.unshift(path);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 8)));
}

export function RepoSelector() {
  const [input, setInput] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { setRepoPath, loadFileTree, loadSessions } = useRepoStore();

  useEffect(() => {
    setRecent(getRecentRepos());
  }, []);

  const openRepo = async (path: string) => {
    const trimmed = path.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      setRepoPath(trimmed);
      await Promise.all([
        loadFileTree(trimmed),
        loadSessions(trimmed),
        startWatching(trimmed),
      ]);
      saveRecentRepo(trimmed);
    } catch (err) {
      console.error('Failed to open repo:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeRecent = (path: string) => {
    const updated = recent.filter((r) => r !== path);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRecent(updated);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 32,
      background: 'var(--bg-void)',
    }}>
      <div className="corner-bracket">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1
            className="font-display"
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 8,
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-magenta), var(--accent-gold))',
              backgroundSize: '200% 200%',
              animation: 'gradient-shift 4s ease infinite',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AgentVisualizer
          </h1>
          <p
            className="mono"
            style={{
              color: 'var(--text-secondary)',
              fontSize: 13,
              borderRight: '2px solid var(--accent-cyan)',
              paddingRight: 4,
              display: 'inline-block',
              animation: 'typing-cursor 1s step-end infinite',
            }}
          >
            Visualize AI coding agent operations as a 3D city
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          width: 480,
          maxWidth: '90vw',
          marginBottom: 24,
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && openRepo(input)}
            placeholder="Enter repository path..."
            className="mono"
            style={{
              flex: 1,
              padding: '10px 14px',
              background: 'rgba(8, 12, 28, 0.9)',
              border: '1px solid var(--border-glow)',
              borderRadius: 6,
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent-cyan)';
              e.target.style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0, 212, 255, 0.15)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            className="neon-button"
            onClick={() => openRepo(input)}
            disabled={loading || !input.trim()}
            style={{
              gap: 6,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              opacity: loading || !input.trim() ? 0.4 : 1,
              color: 'var(--accent-cyan)',
            }}
          >
            <FolderOpen size={16} />
            {loading ? 'Opening...' : 'Open'}
          </button>
        </div>

        {recent.length > 0 && (
          <div style={{ width: 480, maxWidth: '90vw' }}>
            <div className="section-header" style={{ marginBottom: 10 }}>
              <Clock size={12} />
              Recent Repositories
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recent.map((r) => (
                <div
                  key={r}
                  className="holo-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    className="mono"
                    style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    onClick={() => { setInput(r); openRepo(r); }}
                  >
                    {r}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRecent(r); }}
                    style={{ padding: 4, borderRadius: 4, color: 'var(--text-dim)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
