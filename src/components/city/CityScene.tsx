import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { CityRenderer } from './CityRenderer';

export function CityScene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [25, 18, 25], fov: 55 }}
        style={{ background: '#030308' }}
        gl={{ antialias: true, alpha: false }}
      >
        <CityRenderer />
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.4}
            luminanceSmoothing={0.9}
            intensity={0.6}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
