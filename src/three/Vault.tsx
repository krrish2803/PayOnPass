import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollStore } from "../lib/scroll";

export const Vault: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const edgesMatRef = useRef<THREE.LineBasicMaterial>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const chapter = scrollStore.activeChapter;

    // Faint rotation
    groupRef.current.rotation.y = time * 0.1;
    groupRef.current.rotation.x = Math.sin(time * 0.15) * 0.05;

    // Visibility and opacity based on chapter
    let targetOpacity = 0.25;
    if (chapter === 1 || chapter === 3 || chapter === 8) {
      targetOpacity = 0.45;
    } else if (chapter === 4 || chapter === 5) {
      targetOpacity = 0.1;
    } else if (chapter === 7) {
      targetOpacity = 0.05;
    }

    if (edgesMatRef.current) {
      edgesMatRef.current.opacity = THREE.MathUtils.lerp(
        edgesMatRef.current.opacity,
        targetOpacity,
        0.05
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Wireframe Cube */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(2.6, 2.6, 2.6)]} />
        <lineBasicMaterial
          ref={edgesMatRef}
          color="#38bdf8"
          transparent
          opacity={0.35}
        />
      </lineSegments>

      {/* Subtle Corner Markers */}
      {[-1.3, 1.3].map((x) =>
        [-1.3, 1.3].map((y) =>
          [-1.3, 1.3].map((z) => (
            <mesh key={`${x}-${y}-${z}`} position={[x, y, z]}>
              <boxGeometry args={[0.08, 0.08, 0.08]} />
              <meshBasicMaterial color="#14B8A6" transparent opacity={0.6} />
            </mesh>
          ))
        )
      )}
    </group>
  );
};
