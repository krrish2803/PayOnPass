import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { isMobileDevice } from "../lib/gpuTier";

export const Particles: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);

  const count = useMemo(() => (isMobileDevice() ? 80 : 220), []);

  const [positions, scales] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sca = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      sca[i] = Math.random() * 0.05 + 0.02;
    }
    return [pos, sca];
  }, [count]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.elapsedTime * 0.05;
    pointsRef.current.rotation.y = time;
    pointsRef.current.rotation.x = Math.sin(time * 0.5) * 0.1;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#38bdf8"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};
