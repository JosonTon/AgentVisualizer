import { useEffect, useRef } from 'react';
import { usePlaybackStore } from '../stores/playbackStore';

export function usePlayback() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const speed = usePlaybackStore((s) => s.speed);
  const tick = usePlaybackStore((s) => s.tick);
  const lastTickRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 500 / speed;
    let animId: number;

    function loop(time: number) {
      if (time - lastTickRef.current >= intervalMs) {
        lastTickRef.current = time;
        tick();
      }
      animId = requestAnimationFrame(loop);
    }

    lastTickRef.current = performance.now();
    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, speed, tick]);
}
