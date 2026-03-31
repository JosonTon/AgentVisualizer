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
  Color,
  Points,
  PointsMaterial,
  BufferAttribute,
} from 'three';
import type { Mesh } from 'three';
import { Html } from '@react-three/drei';

export const TAG_FIXED_Y = 14;

// Flow direction based on tool
// 'up' = file→agent (reading), 'down' = agent→file (writing), 'both' = bidirectional
type FlowDir = 'up' | 'down' | 'both';

function getFlowDirection(toolName: string): FlowDir {
  switch (toolName) {
    case 'Read': case 'Glob': case 'Grep': case 'Search':
      return 'up';
    case 'Write': case 'Edit':
      return 'down';
    default:
      return 'both';
  }
}

const PARTICLE_COUNT = 5;

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
  const lineRef = useRef<Line>(null);
  const diamondRef = useRef<Mesh>(null);
  const htmlGroupRef = useRef<any>(null);
  const pointsRef = useRef<Points>(null);
  const lastTagPos = useRef({ x: NaN, z: NaN });
  const cachedCurve = useRef<CatmullRomCurve3 | null>(null);

  // Per-particle random direction for 'both' mode: true = up, false = down
  const particleDirs = useRef<boolean[]>([]);
  if (particleDirs.current.length !== PARTICLE_COUNT) {
    particleDirs.current = Array.from({ length: PARTICLE_COUNT }, () => Math.random() > 0.5);
  }

  const parsedColor = useMemo(() => new Color(color), [color]);

  const line = useMemo(() => {
    const geometry = new BufferGeometry();
    const material = new LineDashedMaterial({
      color: parsedColor,
      transparent: true,
      opacity: 0.7,
      dashSize: 0.3,
      gapSize: 0.15,
      depthWrite: false,
    });
    return new Line(geometry, material);
  }, []);

  // Flow particles along callout line
  const { pointsObj, posAttr } = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    const geo = new BufferGeometry();
    const attr = new BufferAttribute(arr, 3);
    geo.setAttribute('position', attr);
    const mat = new PointsMaterial({
      color: parsedColor,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const pts = new Points(geo, mat);
    return { pointsObj: pts, posAttr: attr };
  }, []);

  // Update material colors when color prop changes
  useMemo(() => {
    (line.material as LineDashedMaterial).color.copy(parsedColor);
    (pointsObj.material as PointsMaterial).color.copy(parsedColor);
  }, [parsedColor, line, pointsObj]);

  useFrame(({ clock }, delta) => {
    if (innerRingRef.current) innerRingRef.current.rotation.z += delta * 0.5;

    const tx = tagRef.current.x;
    const tz = tagRef.current.z;

    // Rebuild curve if tag moved
    if (lineRef.current) {
      const l = lineRef.current;
      (l.material as LineDashedMaterial).dashOffset -= delta * 2;

      const dx = tx - lastTagPos.current.x;
      const dz = tz - lastTagPos.current.z;
      if (dx !== dx || dx * dx + dz * dz > 0.0025) {
        lastTagPos.current.x = tx;
        lastTagPos.current.z = tz;
        cachedCurve.current = new CatmullRomCurve3([
          new Vector3(anchorX, anchorY + 0.1, anchorZ),
          new Vector3(anchorX, TAG_FIXED_Y - 1.0, anchorZ),
          new Vector3(tx, TAG_FIXED_Y - 1.0, tz),
          new Vector3(tx, TAG_FIXED_Y, tz),
        ], false, 'centripetal');
        const points = cachedCurve.current.getPoints(24);
        l.geometry.setFromPoints(points);
        l.computeLineDistances();
      }
    }

    // Animate flow particles along curve
    if (cachedCurve.current && pointsRef.current) {
      const flowDir = getFlowDirection(toolName);
      const t = clock.elapsedTime;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Each particle has staggered phase
        const phase = (t * 0.6 + i / PARTICLE_COUNT) % 1;

        let curveT: number;
        if (flowDir === 'up') {
          // 0→1 = bottom to top (file to agent)
          curveT = phase;
        } else if (flowDir === 'down') {
          // 1→0 = top to bottom (agent to file)
          curveT = 1 - phase;
        } else {
          // Bidirectional: each particle has a random fixed direction
          curveT = particleDirs.current[i] ? phase : 1 - phase;
        }

        const pos = cachedCurve.current.getPointAt(curveT);
        arr[i * 3] = pos.x;
        arr[i * 3 + 1] = pos.y;
        arr[i * 3 + 2] = pos.z;
      }
      posAttr.needsUpdate = true;
    }

    if (diamondRef.current) {
      diamondRef.current.position.x = tx;
      diamondRef.current.position.z = tz;
    }
    if (htmlGroupRef.current) {
      htmlGroupRef.current.position.x = tx;
      htmlGroupRef.current.position.z = tz;
    }
  });

  return (
    <group>
      <mesh
        ref={innerRingRef}
        position={[anchorX, anchorY + 0.05, anchorZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.2, 0.35, 12]} />
        <meshBasicMaterial
          color={parsedColor} transparent opacity={0.5}
          blending={AdditiveBlending} depthWrite={false} side={DoubleSide}
        />
      </mesh>

      <primitive object={line} ref={lineRef} />
      <primitive object={pointsObj} ref={pointsRef} />

      <mesh ref={diamondRef} position={[anchorX, TAG_FIXED_Y, anchorZ]} scale={[1, 0.4, 1]}>
        <octahedronGeometry args={[0.08, 0]} />
        <meshBasicMaterial
          color={parsedColor} transparent opacity={0.8}
          blending={AdditiveBlending} depthWrite={false}
        />
      </mesh>

      <group ref={htmlGroupRef} position={[anchorX, TAG_FIXED_Y + 0.3, anchorZ]}>
        <Html center style={{ pointerEvents: 'none' }}>
          <div className="fui-tag" style={{ borderColor: color } as React.CSSProperties}>
            <span className="fui-bracket">[</span>
            <span className="fui-diamond" style={{ color }}>◆</span>
            <span className="fui-tool" style={{ color }}>{toolName}</span>
            <span className="fui-session" style={{ background: sessionColor }}>S{sessionIndex}</span>
            <span className="fui-bracket">]</span>
          </div>
        </Html>
      </group>
    </group>
  );
}
