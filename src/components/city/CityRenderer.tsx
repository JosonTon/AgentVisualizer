import { useMemo, useRef, useState, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useRepoStore } from '../../stores/repoStore';
import { useAgentStore } from '../../stores/agentStore';
import type { ActiveAgent } from '../../stores/agentStore';
import { computeCityLayout } from '../../lib/cityLayout';
import type { BuildingData } from '../../lib/cityLayout';
import { getToolColor } from './AgentBeam';
import { Building } from './Building';
import { AgentMarkerSystem } from './AgentMarkerSystem';
import type { AgentMarkerData } from './AgentMarkerSystem';
import { AgentTrail } from './AgentTrail';
import { PlanZone, PLAN_ZONE_X, PLAN_ZONE_Z, PLAN_ZONE_Y } from './PlanZone';
import { PCZone, PC_ZONE_X, PC_ZONE_Z, PC_ZONE_Y } from './PCZone';
import { MatrixRain } from './MatrixRain';
import { HoloGrid } from './HoloGrid';
import { AmbientParticles } from './AmbientParticles';

const TRAIL_LIFETIME_MS = 8000;

interface TrailData {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  startTime: number;
  createdAt: number;
}

function isPlanPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.includes('.claude') && (lower.includes('plan') || lower.includes('claude.md'));
}

function isProjectFile(filePath: string | undefined, repoPath: string): boolean {
  if (!filePath) return false;
  const nf = filePath.replace(/\\/g, '/').toLowerCase();
  const nr = repoPath.replace(/\\/g, '/').toLowerCase();
  return nf.startsWith(nr);
}

function resolveAgentPosition(
  agent: ActiveAgent,
  buildingMap: Map<string, BuildingData>,
  repoPath: string,
): { type: 'building'; building: BuildingData } | { type: 'plan' } | { type: 'system' } | null {
  const fp = agent.lastEvent.filePath;

  if (!fp) return { type: 'system' };
  if (isPlanPath(fp)) return { type: 'plan' };
  if (!isProjectFile(fp, repoPath)) return { type: 'system' };

  // Normalize and try multiple lookup strategies
  const normalized = fp.replace(/\\/g, '/');
  const b = buildingMap.get(normalized);
  if (b) return { type: 'building', building: b };

  // Try stripping repo prefix for relative match
  const repoNorm = repoPath.replace(/\\/g, '/');
  if (normalized.startsWith(repoNorm)) {
    const relative = normalized.slice(repoNorm.length).replace(/^\//, '');
    for (const [key, val] of buildingMap) {
      if (key.endsWith(relative) || key.endsWith('/' + relative)) {
        return { type: 'building', building: val };
      }
    }
  }

  return { type: 'system' };
}

function getAnchorPosition(
  pos: ReturnType<typeof resolveAgentPosition>,
): [number, number, number] | null {
  if (!pos) return null;
  if (pos.type === 'building') return [pos.building.x, pos.building.height, pos.building.z];
  if (pos.type === 'plan') return [PLAN_ZONE_X, PLAN_ZONE_Y + 0.5, PLAN_ZONE_Z];
  if (pos.type === 'system') return [PC_ZONE_X, PC_ZONE_Y + 1.0, PC_ZONE_Z];
  return null;
}

export function CityRenderer() {
  const fileTree = useRepoStore((s) => s.fileTree);
  const repoPath = useRepoStore((s) => s.repoPath);
  const activeAgents = useAgentStore((s) => s.activeAgents);
  const { clock } = useThree();

  const [trails, setTrails] = useState<TrailData[]>([]);
  const prevPositions = useRef(new Map<string, [number, number, number]>());

  const buildings = useMemo<BuildingData[]>(() => {
    if (!fileTree) return [];
    return computeCityLayout(fileTree);
  }, [fileTree]);

  // Normalize buildingMap keys to forward slashes
  const buildingMap = useMemo(() => {
    const map = new Map<string, BuildingData>();
    for (const b of buildings) {
      map.set(b.filePath.replace(/\\/g, '/'), b);
    }
    return map;
  }, [buildings]);

  // Clear prev positions on repo change
  useEffect(() => {
    prevPositions.current.clear();
  }, [buildingMap]);

  // Build marker data for all agents (buildings + zones)
  const { markerAgents, planActive, pcActive } = useMemo(() => {
    const markers: AgentMarkerData[] = [];
    let planAct = false;
    let pcAct = false;

    for (const [, agent] of activeAgents) {
      const pos = resolveAgentPosition(agent, buildingMap, repoPath);
      const anchor = getAnchorPosition(pos);
      if (!anchor) continue;

      const color = getToolColor(agent.lastEvent.toolName);

      if (pos!.type === 'plan') planAct = true;
      if (pos!.type === 'system') pcAct = true;

      markers.push({
        agentId: agent.agentId,
        sessionId: agent.sessionId,
        anchorPosition: anchor,
        toolName: agent.lastEvent.toolName,
        color,
      });
    }

    return { markerAgents: markers, planActive: planAct, pcActive: pcAct };
  }, [activeAgents, buildingMap, repoPath]);

  // Generate trails when agent positions change
  useEffect(() => {
    const now = Date.now();
    const newTrails: TrailData[] = [];

    for (const [agentId, agent] of activeAgents) {
      const pos = resolveAgentPosition(agent, buildingMap, repoPath);
      const anchor = getAnchorPosition(pos);
      if (!anchor) continue;

      const prevPos = prevPositions.current.get(agentId);
      if (prevPos && (prevPos[0] !== anchor[0] || prevPos[1] !== anchor[1] || prevPos[2] !== anchor[2])) {
        newTrails.push({
          id: `${agentId}-${now}`,
          from: prevPos,
          to: anchor,
          color: getToolColor(agent.lastEvent.toolName),
          startTime: clock.elapsedTime,
          createdAt: now,
        });
      }
      prevPositions.current.set(agentId, anchor);
    }

    if (newTrails.length > 0) {
      setTrails(prev => [...prev, ...newTrails]);
    }
  }, [activeAgents, buildingMap, repoPath, clock]);

  // Clean up old trails (only when there are trails)
  useEffect(() => {
    if (trails.length === 0) return;
    const timeout = setTimeout(() => {
      const cutoff = Date.now() - TRAIL_LIFETIME_MS;
      setTrails(prev => {
        const filtered = prev.filter(t => t.createdAt > cutoff);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, TRAIL_LIFETIME_MS);
    return () => clearTimeout(timeout);
  }, [trails]);

  const activeFiles = useMemo(() => {
    const set = new Set<string>();
    for (const [, agent] of activeAgents) {
      if (agent.lastEvent.filePath) {
        set.add(agent.lastEvent.filePath.replace(/\\/g, '/'));
      }
    }
    return set;
  }, [activeAgents]);

  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight position={[20, 30, 10]} intensity={0.15} color="#8b5cf6" />

      <HoloGrid />
      <MatrixRain />
      <AmbientParticles />

      {buildings.map((b) => (
        <Building
          key={b.filePath}
          data={b}
          highlight={activeFiles.has(b.filePath)}
        />
      ))}

      {/* FUI Agent Marker System with collision avoidance */}
      <AgentMarkerSystem agents={markerAgents} />

      {/* Agent transition trails */}
      {trails.map((trail) => (
        <AgentTrail
          key={trail.id}
          from={trail.from}
          to={trail.to}
          color={trail.color}
          startTime={trail.startTime}
        />
      ))}

      {/* Special zones */}
      <PlanZone active={planActive} />
      <PCZone active={pcActive} />

      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={100}
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={Math.PI / 2.1}
      />

      <fog attach="fog" args={['#030308', 60, 120]} />
    </>
  );
}
