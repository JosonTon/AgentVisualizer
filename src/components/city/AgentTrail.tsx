import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Vector3,
  QuadraticBezierCurve3,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  AdditiveBlending,
  Points,
  PointsMaterial,
  BufferAttribute,
} from 'three';

interface AgentTrailProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  startTime: number;
}

const PARTICLE_COUNT = 6;
const TRAIL_DURATION = 8;

export function AgentTrail({ from, to, color, startTime }: AgentTrailProps) {
  const lineRef = useRef<Line>(null);
  const pointsRef = useRef<Points>(null);

  const { curve, lineObj, pointsObj, posAttr } = useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const distance = start.distanceTo(end);
    const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y = Math.max(start.y, end.y) + distance * 0.4;

    const c = new QuadraticBezierCurve3(start, mid, end);

    // Line
    const lineGeo = new BufferGeometry().setFromPoints(c.getPoints(32));
    const lineMat = new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const line = new Line(lineGeo, lineMat);

    // Points (instead of 6 individual sphere meshes)
    const posArr = new Float32Array(PARTICLE_COUNT * 3);
    const pointGeo = new BufferGeometry();
    const attr = new BufferAttribute(posArr, 3);
    pointGeo.setAttribute('position', attr);
    const pointMat = new PointsMaterial({
      color,
      size: 0.12,
      transparent: true,
      opacity: 1,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const pts = new Points(pointGeo, pointMat);

    return { curve: c, lineObj: line, pointsObj: pts, posAttr: attr };
  }, [from, to, color]);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime - startTime;
    const opacity = Math.max(0, 1 - elapsed / TRAIL_DURATION);

    if (lineRef.current) {
      (lineRef.current.material as LineBasicMaterial).opacity = opacity * 0.4;
    }

    if (pointsRef.current) {
      (pointsRef.current.material as PointsMaterial).opacity = opacity;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = ((elapsed * 0.8 + i / PARTICLE_COUNT) % 1);
        const pos = curve.getPoint(t);
        arr[i * 3] = pos.x;
        arr[i * 3 + 1] = pos.y;
        arr[i * 3 + 2] = pos.z;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <primitive object={lineObj} ref={lineRef} />
      <primitive object={pointsObj} ref={pointsRef} />
    </group>
  );
}
