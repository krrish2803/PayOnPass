import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollStore } from "../lib/scroll";

export const Streams: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const reviewBayRef = useRef<THREE.Group>(null);
  const streamPointsRef = useRef<THREE.Points>(null);

  const PARTICLE_COUNT = 60;
  const positions = React.useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const chapter = scrollStore.activeChapter;
    const { outcomeType } = scrollStore;

    const shouldShow = chapter === 6;
    const targetScale = shouldShow ? 1 : 0.001;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

    // Review bay visibility
    if (reviewBayRef.current) {
      const showBay = shouldShow && outcomeType === "review_bay";
      const bayScale = showBay ? 1 : 0.001;
      reviewBayRef.current.scale.lerp(new THREE.Vector3(bayScale, bayScale, bayScale), 0.1);
    }

    // Stream particle dynamics
    if (shouldShow && streamPointsRef.current) {
      const posAttr = streamPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        const speed = 1.8;
        const progress = (time * speed + i * (1 / PARTICLE_COUNT)) % 1;

        if (outcomeType === "worker_stream") {
          // Flow from 0 to +2.6
          array[i3] = progress * 2.6;
          array[i3 + 1] = Math.sin(progress * Math.PI) * 0.4 - 0.2;
          array[i3 + 2] = Math.cos(progress * 4) * 0.1;
        } else if (outcomeType === "client_refund") {
          // Flow from 0 to -2.6
          array[i3] = -progress * 2.6;
          array[i3 + 1] = Math.sin(progress * Math.PI) * 0.4 - 0.2;
          array[i3 + 2] = Math.cos(progress * 4) * 0.1;
        } else if (outcomeType === "split_stream") {
          // Half to worker, half to client
          const direction = i % 2 === 0 ? 1 : -1;
          array[i3] = direction * progress * 2.6;
          array[i3 + 1] = Math.sin(progress * Math.PI) * 0.3 - 0.2;
          array[i3 + 2] = Math.cos(progress * 4) * 0.1;
        } else {
          // Review bay - subtle hover ring around bay
          const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + time;
          array[i3] = Math.cos(angle) * 0.8;
          array[i3 + 1] = -0.8 + Math.sin(time * 3 + i) * 0.05;
          array[i3 + 2] = Math.sin(angle) * 0.8;
        }
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} scale={[0.001, 0.001, 0.001]}>
      {/* Dynamic Stream Particles */}
      <points ref={streamPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#14B8A6"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Amber Review Bay Platform */}
      <group ref={reviewBayRef} position={[0, -0.8, 0]} scale={[0.001, 0.001, 0.001]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[0.9, 1.1, 0.15, 32]} />
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        {/* Amber Halo Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
          <ringGeometry args={[0.7, 0.85, 32]} />
          <meshBasicMaterial color="#F59E0B" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
};
