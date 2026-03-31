import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import { AdditiveBlending } from 'three';

const COLOR = '#a855f7';
export const PLAN_ZONE_X = -28;
export const PLAN_ZONE_Z = 0;
export const PLAN_ZONE_Y = 0.2;

interface PlanZoneProps {
  active: boolean;
}

export function PlanZone({ active }: PlanZoneProps) {
  const pulseRef = useRef(0);

  useFrame((_s, delta) => {
    if (active) pulseRef.current += delta * 3;
  });

  return (
    <group position={[PLAN_ZONE_X, PLAN_ZONE_Y, PLAN_ZONE_Z]}>
      <mesh>
        <boxGeometry args={[6, 0.1, 4]} />
        <meshBasicMaterial
          color={COLOR}
          transparent
          opacity={active ? 0.18 : 0.08}
          depthWrite={false}
          blending={AdditiveBlending}
        />
        <Edges color={COLOR} threshold={15} />
      </mesh>
      {!active && (
        <Html center position={[0, 1.2, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{
            color: COLOR,
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 'bold',
            letterSpacing: 3,
            textTransform: 'uppercase',
            textShadow: `0 0 8px ${COLOR}`,
            opacity: 0.6,
          }}>
            PLAN
          </div>
        </Html>
      )}
    </group>
  );
}
