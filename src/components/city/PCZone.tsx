import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import { AdditiveBlending } from 'three';

const COLOR = '#06b6d4';
export const PC_ZONE_X = 28;
export const PC_ZONE_Z = 0;
export const PC_ZONE_Y = 1.3;

interface PCZoneProps {
  active: boolean;
}

export function PCZone({ active }: PCZoneProps) {
  const pulseRef = useRef(0);

  useFrame((_s, delta) => {
    if (active) pulseRef.current += delta * 3;
  });

  const fillOpacity = active ? 0.18 : 0.08;

  return (
    <group position={[PC_ZONE_X, 0, PC_ZONE_Z]}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1.5, 0.3, 1]} />
        <meshBasicMaterial color={COLOR} transparent opacity={fillOpacity} depthWrite={false} blending={AdditiveBlending} />
        <Edges color={COLOR} threshold={15} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[3, 2, 0.2]} />
        <meshBasicMaterial color={COLOR} transparent opacity={fillOpacity} depthWrite={false} blending={AdditiveBlending} />
        <Edges color={COLOR} threshold={15} />
      </mesh>
      {!active && (
        <Html center position={[0, 2.8, 0]} style={{ pointerEvents: 'none' }}>
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
            SYSTEM
          </div>
        </Html>
      )}
    </group>
  );
}
