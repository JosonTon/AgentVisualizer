import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute } from 'three';
import type { Points } from 'three';

// Very sparse tiny dots like distant stars
const COUNT = 60;

export function AmbientParticles() {
  const pointsRef = useRef<Points>(null);

  const { basePositions, offsets } = useMemo(() => {
    const base = new Float32Array(COUNT * 3);
    const off = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      base[i * 3] = (Math.random() - 0.5) * 80;
      base[i * 3 + 1] = Math.random() * 20;
      base[i * 3 + 2] = (Math.random() - 0.5) * 80;

      off[i * 3] = Math.random() * Math.PI * 2;
      off[i * 3 + 1] = Math.random() * Math.PI * 2;
      off[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    return { basePositions: base, offsets: off };
  }, []);

  const positions = useMemo(() => new Float32Array(COUNT * 3), []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.getAttribute('position') as BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      posArray[i3] = basePositions[i3] + Math.sin(t * 0.15 + offsets[i3]) * 0.5;
      posArray[i3 + 1] = basePositions[i3 + 1] + Math.sin(t * 0.1 + offsets[i3 + 1]) * 0.3;
      posArray[i3 + 2] = basePositions[i3 + 2] + Math.cos(t * 0.12 + offsets[i3 + 2]) * 0.5;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#ddd6fe"
        transparent
        opacity={0.3}
        blending={AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
