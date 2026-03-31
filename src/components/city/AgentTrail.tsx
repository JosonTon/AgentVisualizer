import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh } from 'three';

interface AgentTrailProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  startTime: number;
}

const PARTICLE_COUNT = 8;
const PARTICLE_SIZE = 0.06;
const TRAIL_DURATION = 8;

export function AgentTrail({ from, to, color, startTime }: AgentTrailProps) {
  const particleRefs = useRef<(Mesh | null)[]>([]);

  const { curve, lineObject } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const distance = start.distanceTo(end);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y = Math.max(start.y, end.y) + distance * 0.4;

    const c = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = c.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);

    return { curve: c, lineObject: line };
  }, [from, to, color]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime - startTime;
    const opacity = Math.max(0, 1 - elapsed / TRAIL_DURATION);

    const lineMat = lineObject.material as THREE.LineBasicMaterial;
    lineMat.opacity = opacity * 0.4;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const mesh = particleRefs.current[i];
      if (!mesh) continue;

      const t = ((elapsed * 0.8 + i / PARTICLE_COUNT) % 1);
      const pos = curve.getPoint(t);
      mesh.position.copy(pos);

      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity * (1 - t * 0.5);
    }
  });

  return (
    <group>
      <primitive object={lineObject} />

      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { particleRefs.current[i] = el; }}
        >
          <sphereGeometry args={[PARTICLE_SIZE, 6, 6]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
