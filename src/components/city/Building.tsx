import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import type { Mesh } from 'three';
import type { BuildingData } from '../../lib/cityLayout';

const HIGHLIGHT_COLOR = '#ff6b35';

interface BuildingProps {
  data: BuildingData;
  highlight?: boolean;
}

export function Building({ data, highlight }: BuildingProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const currentHeight = useRef(0.01);

  const parentFolder = data.filePath.includes('/')
    ? data.filePath.substring(0, data.filePath.lastIndexOf('/') + 1)
    : '';

  const edgeColor = highlight ? HIGHLIGHT_COLOR : hovered ? '#e0e0ff' : data.color;

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const target = data.height;
    const diff = target - currentHeight.current;
    if (Math.abs(diff) < 0.01) return;
    currentHeight.current += diff * Math.min(1, delta * 4);
    meshRef.current.scale.y = currentHeight.current / data.height || 0.01;
    meshRef.current.position.y = (currentHeight.current) / 2;
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[data.x, data.height / 2, data.z]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        onClick={(e) => { e.stopPropagation(); console.log('Building clicked:', data.filePath, data); }}
      >
        <boxGeometry args={[data.width, data.height, data.depth]} />
        {/* Nearly invisible fill - wireframe is the star */}
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={highlight ? 0.35 : hovered ? 0.25 : 0.15}
          depthWrite={false}
        />
        <Edges
          color={edgeColor}
          threshold={15}
        />
      </mesh>
      {hovered && (
        <Html
          center
          position={[data.x, currentHeight.current + 0.8, data.z]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="holo-tooltip">
            {data.fileName}
            {parentFolder && (
              <span className="holo-tooltip-path">{parentFolder}</span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
