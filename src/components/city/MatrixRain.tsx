import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute } from 'three';
import type { Points } from 'three';

// Very sparse, tiny dots - like distant stars drifting down
const PARTICLE_COUNT = 120;
const SPREAD = 80;
const Y_MAX = 30;
const Y_MIN = -2;

export function MatrixRain() {
  const pointsRef = useRef<Points>(null);

  const { positions, speeds } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const spd = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * SPREAD;
      pos[i * 3 + 1] = Math.random() * (Y_MAX - Y_MIN) + Y_MIN;
      pos[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
      spd[i] = 0.3 + Math.random() * 0.7;
    }

    return { positions: pos, speeds: spd };
  }, []);

  useFrame((_state, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position') as BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      posArray[i * 3 + 1] -= spd[i] * delta * 1.5;
      if (posArray[i * 3 + 1] < Y_MIN) {
        posArray[i * 3 + 1] = Y_MAX;
        posArray[i * 3] = (Math.random() - 0.5) * SPREAD;
        posArray[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
      }
    }
    posAttr.needsUpdate = true;
  });

  const spd = speeds;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#c4b5fd"
        transparent
        opacity={0.4}
        blending={AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
