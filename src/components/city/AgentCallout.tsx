import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Vector3,
  CatmullRomCurve3,
  Line,
  BufferGeometry,
  LineDashedMaterial,
  AdditiveBlending,
  DoubleSide,
} from 'three';
import type { Mesh } from 'three';
import { Html } from '@react-three/drei';

export const TAG_FIXED_Y = 14;

export interface AgentCalloutProps {
  anchorX: number;
  anchorZ: number;
  anchorY: number;
  tagRef: { current: { x: number; z: number } };
  color: string;
  toolName: string;
  agentId: string;
  sessionIndex: number;
  sessionColor: string;
}

export function AgentCallout({
  anchorX, anchorZ, anchorY,
  tagRef, color, toolName,
  sessionIndex, sessionColor,
}: AgentCalloutProps) {
  const innerRingRef = useRef<Mesh>(null);
  const outerRingRef = useRef<Mesh>(null);
  const lineRef = useRef<Line>(null);
  const diamondRef = useRef<Mesh>(null);
  const htmlGroupRef = useRef<any>(null);

  const line = useMemo(() => {
    const geometry = new BufferGeometry();
    const material = new LineDashedMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      dashSize: 0.3,
      gapSize: 0.15,
      depthWrite: false,
    });
    return new Line(geometry, material);
  }, []);

  useFrame((_, delta) => {
    if (innerRingRef.current) innerRingRef.current.rotation.z += delta * 0.5;
    if (outerRingRef.current) outerRingRef.current.rotation.z -= delta * 0.3;

    const tx = tagRef.current.x;
    const tz = tagRef.current.z;

    // Update callout line
    if (lineRef.current) {
      const l = lineRef.current;
      const mat = l.material as LineDashedMaterial;
      mat.color.set(color);
      mat.dashOffset -= delta * 2;

      const curve = new CatmullRomCurve3([
        new Vector3(anchorX, anchorY + 0.1, anchorZ),
        new Vector3(anchorX, TAG_FIXED_Y - 1.0, anchorZ),
        new Vector3(tx, TAG_FIXED_Y - 1.0, tz),
        new Vector3(tx, TAG_FIXED_Y, tz),
      ], false, 'centripetal');
      const points = curve.getPoints(48);
      l.geometry.setFromPoints(points);
      l.computeLineDistances();
    }

    // Move diamond + html to tag position
    if (diamondRef.current) {
      diamondRef.current.position.set(tx, TAG_FIXED_Y, tz);
    }
    if (htmlGroupRef.current) {
      htmlGroupRef.current.position.set(tx, TAG_FIXED_Y + 0.3, tz);
    }
  });

  return (
    <group>
      {/* Contact Ring - inner */}
      <mesh
        ref={innerRingRef}
        position={[anchorX, anchorY + 0.05, anchorZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.2, 0.3, 24]} />
        <meshBasicMaterial
          color={color}
          transparent opacity={0.6}
          blending={AdditiveBlending}
          depthWrite={false} side={DoubleSide}
        />
      </mesh>

      {/* Contact Ring - outer */}
      <mesh
        ref={outerRingRef}
        position={[anchorX, anchorY + 0.05, anchorZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.35, 0.42, 24]} />
        <meshBasicMaterial
          color={color}
          transparent opacity={0.25}
          blending={AdditiveBlending}
          depthWrite={false} side={DoubleSide}
        />
      </mesh>

      {/* Callout Line */}
      <primitive object={line} ref={lineRef} />

      {/* Diamond marker at tag end */}
      <mesh ref={diamondRef} position={[anchorX, TAG_FIXED_Y, anchorZ]} scale={[1, 0.4, 1]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshBasicMaterial
          color={color} transparent opacity={0.8}
          blending={AdditiveBlending} depthWrite={false}
        />
      </mesh>

      {/* Tag Label */}
      <group ref={htmlGroupRef} position={[anchorX, TAG_FIXED_Y + 0.3, anchorZ]}>
        <Html center style={{ pointerEvents: 'none' }}>
          <div
            className="fui-tag"
            style={{ borderColor: color } as React.CSSProperties}
          >
            <span className="fui-bracket">[</span>
            <span className="fui-diamond" style={{ color }}>◆</span>
            <span className="fui-tool" style={{ color }}>{toolName}</span>
            <span className="fui-session" style={{ background: sessionColor }}>
              S{sessionIndex}
            </span>
            <span className="fui-bracket">]</span>
          </div>
        </Html>
      </group>
    </group>
  );
}
