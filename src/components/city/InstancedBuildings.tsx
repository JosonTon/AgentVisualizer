import { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  Object3D,
  Color,
  InstancedMesh,
  BoxGeometry,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  MeshBasicMaterial,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Float32BufferAttribute,
  Matrix4,
} from 'three';
import type { BuildingData } from '../../lib/cityLayout';

const HIGHLIGHT_HEX = '#ff6b35';
const HOVER_EDGE_HEX = '#e0e0ff';
const tmpColor = new Color();
const tmpMatrix = new Matrix4();

interface InstancedBuildingsProps {
  buildings: BuildingData[];
  activeFiles: Set<string>;
}

export function InstancedBuildings({ buildings, activeFiles }: InstancedBuildingsProps) {
  const dummy = useMemo(() => new Object3D(), []);
  const count = buildings.length;

  const fillRef = useRef<InstancedMesh>(null);
  const edgesRef = useRef<LineSegments>(null);
  const currentHeights = useRef(new Float32Array(0));
  const animating = useRef(true);
  const instanceMatrices = useRef(new Float32Array(0));

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const prevHoveredIndex = useRef<number | null>(null);

  // Create fill InstancedMesh + edges LineSegments with instanced geometry
  const { fillMesh, edgesLine, edgeColorAttr } = useMemo(() => {
    if (count === 0) return { fillMesh: null, edgesLine: null, edgeColorAttr: null };

    const box = new BoxGeometry(1, 1, 1);
    const edges = new EdgesGeometry(box);

    // Color array
    const colorArr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const highlighted = activeFiles.has(buildings[i].filePath);
      tmpColor.set(highlighted ? HIGHLIGHT_HEX : buildings[i].color);
      colorArr[i * 3] = tmpColor.r;
      colorArr[i * 3 + 1] = tmpColor.g;
      colorArr[i * 3 + 2] = tmpColor.b;
    }

    // Fill mesh (solid transparent)
    const fillMat = new MeshBasicMaterial({
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const fill = new InstancedMesh(box, fillMat, count);
    fill.instanceColor = new InstancedBufferAttribute(colorArr.slice(), 3);
    fill.frustumCulled = false;

    // Instanced edges: use InstancedBufferGeometry with edge positions + per-instance matrix/color
    const edgePositions = edges.getAttribute('position');
    const instancedGeo = new InstancedBufferGeometry();
    instancedGeo.setAttribute('position', edgePositions);
    instancedGeo.instanceCount = count;

    // Per-instance transformation: 4x4 matrix as 4 vec4 attributes
    const matrices = new Float32Array(count * 16);
    for (let i = 0; i < count; i++) {
      // Identity initially
      tmpMatrix.identity();
      matrices.set(tmpMatrix.elements, i * 16);
    }
    instanceMatrices.current = matrices;

    const matAttr0 = new InstancedBufferAttribute(new Float32Array(count * 4), 4);
    const matAttr1 = new InstancedBufferAttribute(new Float32Array(count * 4), 4);
    const matAttr2 = new InstancedBufferAttribute(new Float32Array(count * 4), 4);
    const matAttr3 = new InstancedBufferAttribute(new Float32Array(count * 4), 4);

    for (let i = 0; i < count; i++) {
      const o = i * 16;
      // elements is column-major: [col0(4), col1(4), col2(4), col3(4)]
      matAttr0.setXYZW(i, matrices[o],   matrices[o+1],  matrices[o+2],  matrices[o+3]);
      matAttr1.setXYZW(i, matrices[o+4], matrices[o+5],  matrices[o+6],  matrices[o+7]);
      matAttr2.setXYZW(i, matrices[o+8], matrices[o+9],  matrices[o+10], matrices[o+11]);
      matAttr3.setXYZW(i, matrices[o+12],matrices[o+13], matrices[o+14], matrices[o+15]);
    }

    instancedGeo.setAttribute('aInstanceMatrix0', matAttr0);
    instancedGeo.setAttribute('aInstanceMatrix1', matAttr1);
    instancedGeo.setAttribute('aInstanceMatrix2', matAttr2);
    instancedGeo.setAttribute('aInstanceMatrix3', matAttr3);

    // Per-instance color
    const edgeColors = new InstancedBufferAttribute(colorArr.slice(), 3);
    instancedGeo.setAttribute('instanceColor', edgeColors);

    // Custom shader material for instanced lines
    const edgeMat = new LineBasicMaterial({ vertexColors: false });
    // Override with raw shader to support instancing
    edgeMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        attribute vec4 aInstanceMatrix0;
        attribute vec4 aInstanceMatrix1;
        attribute vec4 aInstanceMatrix2;
        attribute vec4 aInstanceMatrix3;
        attribute vec3 instanceColor;
        varying vec3 vIColor;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        mat4 instanceMatrix = mat4(
          aInstanceMatrix0,
          aInstanceMatrix1,
          aInstanceMatrix2,
          aInstanceMatrix3
        );
        transformed = (instanceMatrix * vec4(transformed, 1.0)).xyz;
        vIColor = instanceColor;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vIColor;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `diffuseColor.rgb = vIColor;`
      );
    };

    const line = new LineSegments(instancedGeo, edgeMat);
    line.frustumCulled = false;

    // Init fill matrices
    for (let i = 0; i < count; i++) {
      dummy.position.set(buildings[i].x, 0, buildings[i].z);
      dummy.scale.set(buildings[i].width, 0.01, buildings[i].depth);
      dummy.updateMatrix();
      fill.setMatrixAt(i, dummy.matrix);
    }
    fill.instanceMatrix.needsUpdate = true;

    return { fillMesh: fill, edgesLine: line, edgeColorAttr: edgeColors };
  }, [buildings, count]);

  // Reset heights
  useEffect(() => {
    currentHeights.current = new Float32Array(count).fill(0.01);
    animating.current = true;
    fillRef.current = fillMesh;
    edgesRef.current = edgesLine;
  }, [fillMesh, edgesLine, count]);

  // Update colors when activeFiles changes
  useEffect(() => {
    if (!fillRef.current?.instanceColor || !edgeColorAttr) return;
    for (let i = 0; i < count; i++) {
      const highlighted = activeFiles.has(buildings[i].filePath);
      tmpColor.set(highlighted ? HIGHLIGHT_HEX : buildings[i].color);
      fillRef.current.instanceColor.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
      edgeColorAttr.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
    }
    fillRef.current.instanceColor.needsUpdate = true;
    edgeColorAttr.needsUpdate = true;
  }, [activeFiles, buildings, count, edgeColorAttr]);

  useFrame((_, delta) => {
    const fill = fillRef.current;
    const edges = edgesRef.current;
    if (!fill || !edges || count === 0) return;

    // Hover color on edges
    if (hoveredIndex !== prevHoveredIndex.current && edgeColorAttr) {
      if (prevHoveredIndex.current !== null && prevHoveredIndex.current < count) {
        const pi = prevHoveredIndex.current;
        tmpColor.set(activeFiles.has(buildings[pi].filePath) ? HIGHLIGHT_HEX : buildings[pi].color);
        edgeColorAttr.setXYZ(pi, tmpColor.r, tmpColor.g, tmpColor.b);
      }
      if (hoveredIndex !== null && hoveredIndex < count) {
        tmpColor.set(activeFiles.has(buildings[hoveredIndex].filePath) ? HIGHLIGHT_HEX : HOVER_EDGE_HEX);
        edgeColorAttr.setXYZ(hoveredIndex, tmpColor.r, tmpColor.g, tmpColor.b);
      }
      edgeColorAttr.needsUpdate = true;
      prevHoveredIndex.current = hoveredIndex;
    }

    // Animate heights
    if (!animating.current) return;
    let any = false;
    const geo = edges.geometry as InstancedBufferGeometry;
    const m0 = geo.getAttribute('aInstanceMatrix0') as InstancedBufferAttribute;
    const m1 = geo.getAttribute('aInstanceMatrix1') as InstancedBufferAttribute;
    const m2 = geo.getAttribute('aInstanceMatrix2') as InstancedBufferAttribute;
    const m3 = geo.getAttribute('aInstanceMatrix3') as InstancedBufferAttribute;

    for (let i = 0; i < count; i++) {
      const target = buildings[i].height;
      const diff = target - currentHeights.current[i];
      if (Math.abs(diff) > 0.01) {
        currentHeights.current[i] += diff * Math.min(1, delta * 4);
        any = true;
      }
      const h = currentHeights.current[i];
      dummy.position.set(buildings[i].x, h / 2, buildings[i].z);
      dummy.scale.set(buildings[i].width, h, buildings[i].depth);
      dummy.updateMatrix();
      fill.setMatrixAt(i, dummy.matrix);

      const e = dummy.matrix.elements;
      m0.setXYZW(i, e[0],  e[1],  e[2],  e[3]);
      m1.setXYZW(i, e[4],  e[5],  e[6],  e[7]);
      m2.setXYZW(i, e[8],  e[9],  e[10], e[11]);
      m3.setXYZW(i, e[12], e[13], e[14], e[15]);
    }

    fill.instanceMatrix.needsUpdate = true;
    m0.needsUpdate = true;
    m1.needsUpdate = true;
    m2.needsUpdate = true;
    m3.needsUpdate = true;

    if (!any) animating.current = false;
  });

  const handlePointerMove = useCallback((e: any) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      setHoveredIndex(e.instanceId);
      document.body.style.cursor = 'pointer';
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    setHoveredIndex(null);
    document.body.style.cursor = 'default';
  }, []);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && e.instanceId < buildings.length) {
      console.log('Building clicked:', buildings[e.instanceId].filePath, buildings[e.instanceId]);
    }
  }, [buildings]);

  const hovered = hoveredIndex !== null && hoveredIndex < count ? buildings[hoveredIndex] : null;
  const tooltipFolder = hovered?.filePath.includes('/')
    ? hovered.filePath.substring(0, hovered.filePath.lastIndexOf('/') + 1) : '';

  if (!fillMesh || !edgesLine) return null;

  return (
    <group>
      <primitive
        object={fillMesh}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      <primitive object={edgesLine} />

      {hovered && (
        <Html
          center
          position={[hovered.x, (currentHeights.current[hoveredIndex!] || 0) + 0.8, hovered.z]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="holo-tooltip">
            {hovered.fileName}
            {tooltipFolder && <span className="holo-tooltip-path">{tooltipFolder}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}
