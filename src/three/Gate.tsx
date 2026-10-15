import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollStore } from "../lib/scroll";

export const Gate: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const chapter = scrollStore.activeChapter;
    // Visible in Chapter 5 (Verifier close-up)
    const shouldShow = chapter === 5;
    const targetScale = shouldShow ? 1 : 0.001;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

    if (shouldShow) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    }
  });

  return (
    <group ref={groupRef} position={[1.5, 0.4, 0]} scale={[0.001, 0.001, 0.001]}>
      {/* Slab 1: Solid "Rules" Gate (Hard Gate) */}
      <mesh position={[-0.45, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 1.8, 1.2]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.9}
          roughness={0.25}
        />
      </mesh>
      {/* Hard gate edge accent */}
      <mesh position={[-0.34, 0, 0]}>
        <boxGeometry args={[0.02, 1.76, 1.16]} />
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.6} />
      </mesh>

      {/* Slab 2: Glassy "AI Audit" Gate (Soft Evaluator) */}
      <mesh position={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.2, 1.8, 1.2]} />
        <meshPhysicalMaterial
          color="#38bdf8"
          transmission={0.85}
          opacity={1}
          transparent
          roughness={0.15}
          ior={1.45}
          thickness={0.4}
        />
      </mesh>
      {/* AI gate edge accent */}
      <mesh position={[0.34, 0, 0]}>
        <boxGeometry args={[0.02, 1.76, 1.16]} />
        <meshBasicMaterial color="#8B5CF6" transparent opacity={0.7} />
      </mesh>

      {/* Threshold Floor Plate */}
      <mesh position={[0, -0.92, 0]}>
        <boxGeometry args={[1.4, 0.06, 1.4]} />
        <meshStandardMaterial color="#0f172a" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
};
