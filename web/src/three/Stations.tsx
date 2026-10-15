import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollStore } from "../lib/scroll";

export const Stations: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const chapter = scrollStore.activeChapter;
    const shouldShow = chapter === 4;
    const targetScale = shouldShow ? 1 : 0.001;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
  });

  const stationPositions: [number, number, number][] = [
    [-2.2, -0.6, 0], // Station 1: Scope
    [-1.1, -0.6, 0], // Station 2: Fund
    [0.0, -0.6, 0],  // Station 3: Deliver
    [1.1, -0.6, 0],  // Station 4: Verify
    [2.2, -0.6, 0],  // Station 5: Settle
  ];

  return (
    <group ref={groupRef} scale={[0.001, 0.001, 0.001]}>
      {/* Station 1: Scope (Prism Spec Pillar) */}
      <group position={stationPositions[0]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.25, 0.35, 0.8, 6]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <octahedronGeometry args={[0.18]} />
          <meshStandardMaterial color="#14B8A6" emissive="#14B8A6" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Station 2: Fund (Safe / Capture Pedestal) */}
      <group position={stationPositions[1]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.5, 0.8, 0.5]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <torusGeometry args={[0.16, 0.04, 16, 24]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Station 3: Deliver (Inbox / Tray Platform) */}
      <group position={stationPositions[2]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.3, 0.35, 0.8, 16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <coneGeometry args={[0.2, 0.3, 4]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Station 4: Verify (Dual Inspector Gate) */}
      <group position={stationPositions[3]}>
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.25, 0.35, 0.8, 8]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <dodecahedronGeometry args={[0.18]} />
          <meshStandardMaterial color="#14B8A6" emissive="#14B8A6" emissiveIntensity={1.0} />
        </mesh>
      </group>

      {/* Station 5: Settle (Split / Release Plinth) */}
      <group position={stationPositions[4]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.55, 0.8, 0.4]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color="#14B8A6" emissive="#14B8A6" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* Connecting transit guide rails */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-2.5, -0.8, 0, 2.5, -0.8, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#334155" transparent opacity={0.6} />
      </lineSegments>
    </group>
  );
};
