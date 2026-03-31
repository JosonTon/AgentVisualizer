import { Play, Pause, SkipBack } from 'lucide-react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { usePlayback } from '../../hooks/usePlayback';
import { TimelineBar } from './TimelineBar';

const SPEEDS = [1, 2, 5, 10, 50];

export function PlaybackControls() {
  const { isPlaying, speed, currentIndex, historyEvents, play, pause, setSpeed, reset } =
    usePlaybackStore();

  usePlayback();

  const total = historyEvents.length;
  if (total === 0) return null;

  return (
    <div
      className="glass-panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        borderTop: '1px solid transparent',
        backgroundImage: 'linear-gradient(var(--bg-panel), var(--bg-panel)), linear-gradient(90deg, var(--accent-cyan), var(--accent-magenta), var(--accent-cyan))',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        position: 'relative',
      }}
    >
      {/* Play/Pause */}
      <button
        className="playback-btn"
        onClick={() => isPlaying ? pause() : play()}
        style={isPlaying ? {
          boxShadow: '0 0 16px rgba(0, 212, 255, 0.3)',
          borderColor: 'var(--accent-cyan)',
          animation: 'pulse-glow 2s ease infinite',
        } : undefined}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {/* Reset */}
      <button className="playback-btn" onClick={reset}>
        <SkipBack size={14} />
      </button>

      {/* Speed selector */}
      <div style={{ display: 'flex', gap: 2 }}>
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`speed-btn${speed === s ? ' active' : ''}`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Timeline */}
      <TimelineBar />

      {/* Event counter */}
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
        {currentIndex + 1} / {total}
      </span>
    </div>
  );
}
