import { useMemo } from 'react';
import { ShaderMaterial, DoubleSide } from 'three';

// Subtle dot-grid like Tau Ceti Explorer - sparse dots at intersections
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vec2 centered = vUv - 0.5;
    float dist = length(centered);

    // Grid dots at intersections
    float cellSize = 5.0 / 120.0;
    vec2 gridPos = fract(vUv / cellSize);
    vec2 fromCenter = gridPos - 0.5;
    float dot = length(fromCenter);

    // Small dots at grid intersections
    float dotMask = 1.0 - smoothstep(0.02, 0.04, dot);

    // Subtle grid lines
    vec2 gridLine = abs(fract(vUv / cellSize) - 0.5);
    float line = 1.0 - step(0.01, min(gridLine.x, gridLine.y));

    // Distance fade - tight
    float fade = 1.0 - smoothstep(0.15, 0.45, dist);

    // Combine: dots are brighter than lines
    float alpha = (dotMask * 0.5 + line * 0.06) * fade;

    vec3 color = vec3(0.55, 0.36, 0.98); // purple #8b5cf6
    gl_FragColor = vec4(color, alpha);
  }
`;

export function HoloGrid() {
  const shaderMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} material={shaderMaterial}>
      <planeGeometry args={[120, 120, 1, 1]} />
    </mesh>
  );
}
