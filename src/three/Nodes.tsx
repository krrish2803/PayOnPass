import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollStore } from "../lib/scroll";

export const Nodes: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const clientMesh = useRef<THREE.Mesh>(null);
  const workerMesh = useRef<THREE.Mesh>(null);
  const clientMat = useRef<THREE.MeshStandardMaterial>(null);
  const workerMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    const chapter = scrollStore.activeChapter;

    // Show in Chapter 2 (Problem) and Chapter 6 (Outcomes)
    const shouldShow = chapter === 2 || chapter === 6;
    const targetScale = shouldShow ? 1 : 0.001;

    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

    if (clientMesh.current) {
      clientMesh.current.position.y = Math.sin(time * 2) * 0.1;
      clientMesh.current.rotation.y = time * 0.4;
    }

    if (workerMesh.current) {
      workerMesh.current.position.y = Math.cos(time * 2) * 0.1;
      workerMesh.current.rotation.x = time * 0.5;
      workerMesh.current.rotation.y = time * 0.3;
    }

    // Material tint pulses
    if (clientMat.current && workerMat.current) {
      if (chapter === 2) {
        // Red tension pulse
        const pulse = 0.5 + Math.sin(time * 4) * 0.3;
        clientMat.current.emissive = new THREE.Color("#EF4444");
        clientMat.current.emissiveIntensity = pulse;
        workerMat.current.emissive = new THREE.Color("#EF4444");
        workerMat.current.emissiveIntensity = pulse;
      } else {
        // Calm standard tones
        clientMat.current.emissive = new THREE.Color("#38BDF8");
        clientMat.current.emissiveIntensity = 0.5;
        workerMat.current.emissive = new THREE.Color("#14B8A6");
        workerMat.current.emissiveIntensity = 0.5;
      }
    }
  });

  return (
    <group ref={groupRef} scale={[0.001, 0.001, 0.001]}>
      {/* Client Node (Left Sphere) */}
      <group position={[-2.8, 0, 0]}>
        <mesh ref={clientMesh} castShadow>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial
            ref={clientMat}
            color="#0f172a"
            emissive="#38BDF8"
            emissiveIntensity={0.5}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
        {/* Subtle label ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.75, 32]} />
          <meshBasicMaterial color="#38BDF8" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Worker Node (Right Icosahedron) */}
      <group position={[2.8, 0, 0]}>
        <mesh ref={workerMesh} castShadow>
          <icosahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial
            ref={workerMat}
            color="#0f172a"
            emissive="#14B8A6"
            emissiveIntensity={0.5}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Subtle label ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 0.85, 32]} />
          <meshBasicMaterial color="#14B8A6" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Tension line between nodes in Chapter 2 */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-2.2, 0, 0, 2.2, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineDashedMaterial
          color="#EF4444"
          dashSize={0.2}
          gapSize={0.1}
          transparent
          opacity={0.35}
        />
      </lineSegments>
    </group>
  );
};
