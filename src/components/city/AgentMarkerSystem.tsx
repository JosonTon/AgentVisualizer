import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AgentCallout } from './AgentCallout';
import { getSessionColor, getSessionIndex } from '../../lib/sessionColors';

export interface AgentMarkerData {
  agentId: string;
  sessionId: string;
  anchorPosition: [number, number, number];
  toolName: string;
  color: string;
}

interface PhysicsEntry {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

const MIN_DISTANCE = 2.0;
const REPULSION_STRENGTH = 0.06;
const SPRING_K = 0.03;
const DAMPING = 0.85;

export function AgentMarkerSystem({ agents }: { agents: AgentMarkerData[] }) {
  const physicsState = useRef(new Map<string, PhysicsEntry>());
  const tagRefs = useRef(new Map<string, { current: { x: number; z: number } }>());

  // Sync physics state with current agents
  const activeIds = useMemo(() => {
    const ids = new Set(agents.map(a => a.agentId));

    for (const agent of agents) {
      if (!physicsState.current.has(agent.agentId)) {
        physicsState.current.set(agent.agentId, {
          x: agent.anchorPosition[0],
          z: agent.anchorPosition[2],
          vx: 0, vz: 0,
        });
        tagRefs.current.set(agent.agentId, {
          current: { x: agent.anchorPosition[0], z: agent.anchorPosition[2] },
        });
      }
    }

    for (const key of physicsState.current.keys()) {
      if (!ids.has(key)) {
        physicsState.current.delete(key);
        tagRefs.current.delete(key);
      }
    }

    return ids;
  }, [agents]);

  useFrame(() => {
    const entries: { id: string; state: PhysicsEntry; desiredX: number; desiredZ: number }[] = [];
    for (const agent of agents) {
      const state = physicsState.current.get(agent.agentId);
      if (!state) continue;
      entries.push({
        id: agent.agentId,
        state,
        desiredX: agent.anchorPosition[0],
        desiredZ: agent.anchorPosition[2],
      });
    }

    const n = entries.length;

    // Repulsion
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = entries[i].state;
        const b = entries[j].state;
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < MIN_DISTANCE && dist > 0.001) {
          const force = (MIN_DISTANCE - dist) * REPULSION_STRENGTH;
          const nx = dx / dist;
          const nz = dz / dist;
          a.vx += nx * force;
          a.vz += nz * force;
          b.vx -= nx * force;
          b.vz -= nz * force;
        }
      }
    }

    // Spring + integrate
    for (let i = 0; i < n; i++) {
      const { state, id, desiredX, desiredZ } = entries[i];
      state.vx += (desiredX - state.x) * SPRING_K;
      state.vz += (desiredZ - state.z) * SPRING_K;
      state.vx *= DAMPING;
      state.vz *= DAMPING;
      state.x += state.vx;
      state.z += state.vz;

      const ref = tagRefs.current.get(id);
      if (ref) {
        ref.current.x = state.x;
        ref.current.z = state.z;
      }
    }
  });

  return (
    <group>
      {agents.map(agent => {
        if (!activeIds.has(agent.agentId)) return null;
        const ref = tagRefs.current.get(agent.agentId);
        if (!ref) return null;
        return (
          <AgentCallout
            key={agent.agentId}
            anchorX={agent.anchorPosition[0]}
            anchorY={agent.anchorPosition[1]}
            anchorZ={agent.anchorPosition[2]}
            tagRef={ref}
            color={agent.color}
            toolName={agent.toolName}
            agentId={agent.agentId}
            sessionIndex={getSessionIndex(agent.sessionId)}
            sessionColor={getSessionColor(agent.sessionId)}
          />
        );
      })}
    </group>
  );
}
