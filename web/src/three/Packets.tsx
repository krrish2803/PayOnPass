import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollStore } from "../lib/scroll";

export const Packets: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const hostileRef = useRef<THREE.Group>(null);
  const cleanRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const chapter = scrollStore.activeChapter;

    const shouldShow = chapter === 5;
    const targetScale = shouldShow ? 1 : 0.001;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

    if (shouldShow) {
      // Hostile packet trajectory (repeating cycle)
      if (hostileRef.current) {
        const cycle = (time * 1.6) % 3.0; // 0 to 3s cycle
        let zPos = 0;
        let xPos = -0.3; // Aiming near rules slab

        if (cycle < 1.0) {
          // Approach gate
          zPos = THREE.MathUtils.lerp(2.2, 0.4, cycle);
        } else if (cycle < 1.8) {
          // Bounce / spring backwards
          const bounceProgress = (cycle - 1.0) / 0.8;
          // Spring bounce curve
          const spring = Math.sin(bounceProgress * Math.PI) * 0.4;
          zPos = 0.4 + bounceProgress * 1.4 + spring;
          xPos -= bounceProgress * 0.3;
        } else {
          // Reset phase
          zPos = 2.2;
        }

        hostileRef.current.position.set(xPos, 0, zPos);
        hostileRef.current.rotation.x = time * 4.0;
        hostileRef.current.rotation.y = time * 3.0;
      }

      // Clean packet trajectory (passes through smoothly)
      if (cleanRef.current) {
        const cycle = ((time * 1.2) + 0.5) % 3.0;
        let zPos = 0;
        if (cycle < 2.2) {
          // Glides straight through the center gap
          zPos = THREE.MathUtils.lerp(2.2, -1.8, cycle / 2.2);
        } else {
          zPos = 2.2;
        }
        cleanRef.current.position.set(0, 0, zPos);
        cleanRef.current.rotation.y = time * 2.0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[1.5, 0.4, 0]} scale={[0.001, 0.001, 0.001]}>
      {/* Spiky Red Hostile Packet (Adversarial Payload) */}
      <group ref={hostileRef}>
        <mesh>
          <icosahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial
            color="#EF4444"
            emissive="#EF4444"
            emissiveIntensity={1.8}
            roughness={0.2}
          />
        </mesh>
        {/* Spikes */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[i * 0.8, i * 1.2, 0]}>
            <coneGeometry args={[0.06, 0.38, 4]} />
            <meshStandardMaterial color="#EF4444" emissive="#EF4444" emissiveIntensity={1.2} />
          </mesh>
        ))}
      </group>

      {/* Small Glowing Teal Clean Packet (Valid Work) */}
      <mesh ref={cleanRef}>
        <octahedronGeometry args={[0.14]} />
        <meshStandardMaterial
          color="#14B8A6"
          emissive="#14B8A6"
          emissiveIntensity={2.5}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
};
