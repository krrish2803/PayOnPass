import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollStore } from "../lib/scroll";

export const ChecklistRings: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const ARC_COUNT = 5;
  const GAP = 0.08; // radians
  const ARC_ANGLE = (Math.PI * 2) / ARC_COUNT - GAP;

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const chapter = scrollStore.activeChapter;

    // Show in Chapter 3 (Solution)
    const shouldShow = chapter === 3;
    const targetScale = shouldShow ? 1 : 0.001;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

    if (shouldShow) {
      groupRef.current.rotation.z = time * 0.2;

      // Light arcs in sequence
      materialsRef.current.forEach((mat, idx) => {
        if (!mat) return;
        const phase = (time * 1.5 - idx * 0.4) % (ARC_COUNT * 0.6);
        const isActive = phase > 0 && phase < 2.5;
        mat.opacity = isActive ? 0.9 : 0.25;
        mat.color.set(isActive ? "#14B8A6" : "#0d9488");
      });
    }
  });

  return (
    <group ref={groupRef} scale={[0.001, 0.001, 0.001]}>
      {Array.from({ length: ARC_COUNT }).map((_, idx) => {
        const startAngle = idx * (ARC_ANGLE + GAP);
        return (
          <mesh
            key={idx}
            rotation={[0, 0, startAngle]}
            position={[0, 0, 0]}
          >
            <ringGeometry args={[1.35, 1.42, 32, 1, 0, ARC_ANGLE]} />
            <meshBasicMaterial
              ref={(el) => (materialsRef.current[idx] = el)}
              color="#14B8A6"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
};
