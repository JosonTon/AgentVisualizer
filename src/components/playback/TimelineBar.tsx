import { useMemo } from 'react';
import { usePlaybackStore } from '../../stores/playbackStore';

export function TimelineBar() {
  const { currentIndex, historyEvents, seekTo } = usePlaybackStore();
  const total = historyEvents.length;

  // Compute a mini density bar (divide timeline into ~80 bins)
  const density = useMemo(() => {
    if (total === 0) return [];
    const bins = 80;
    const binSize = Math.max(1, Math.ceil(total / bins));
    const counts: number[] = [];
    for (let i = 0; i < bins; i++) {
      const start = i * binSize;
      const end = Math.min(start + binSize, total);
      counts.push(end - start);
    }
    const maxCount = Math.max(...counts, 1);
    return counts.map((c) => c / maxCount);
  }, [total]);

  if (total === 0) return null;

  const currentEvent = historyEvents[currentIndex];
  const timeStr = currentEvent
    ? new Date(currentEvent.timestamp).toLocaleTimeString()
    : '--:--:--';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    }}>
      {/* Density visualization */}
      <div style={{
        flex: 1,
        position: 'relative',
        height: 32,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}>
        {/* Density bars */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          height: 16,
          marginBottom: 2,
        }}>
          {density.map((d, i) => {
            const isPast = i <= (currentIndex / total) * density.length;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(2, d * 100)}%`,
                  background: isPast
                    ? 'linear-gradient(180deg, var(--accent-cyan), rgba(0, 212, 255, 0.3))'
                    : 'rgba(0, 212, 255, 0.08)',
                  borderRadius: 1,
                  transition: 'background 0.1s',
                  boxShadow: isPast ? '0 0 4px rgba(0, 212, 255, 0.2)' : 'none',
                }}
              />
            );
          })}
        </div>

        {/* Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={currentIndex}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="timeline-slider"
        />
      </div>

      {/* Timestamp */}
      <span className="mono" style={{ fontSize: 11, color: 'var(--accent-cyan)', whiteSpace: 'nowrap', opacity: 0.7 }}>
        {timeStr}
      </span>
    </div>
  );
}
