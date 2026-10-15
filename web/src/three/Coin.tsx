import React, { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { scrollStore } from "../lib/scroll";

interface CoinProps {
  lerpedProgress: React.MutableRefObject<number>;
}

export const Coin: React.FC<CoinProps> = ({ lerpedProgress }) => {
  const meshRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ringMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const t = lerpedProgress.current;
    const time = state.clock.elapsedTime;
    const { mouseX, mouseY, outcomeType } = scrollStore;

    // Determine current chapter
    const chapter = scrollStore.activeChapter;

    // Reset base colors
    let bodyColor = new THREE.Color("#1e293b");
    let ringEmissive = new THREE.Color("#14B8A6");
    let ringIntensity = 2.0;

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;
    let rotX = 0.3;
    let rotY = time * 0.8;
    let rotZ = 0;

    if (chapter === 1) {
      // Chapter 1: Hero - floating, slow rotation, subtle mouse parallax
      targetX = mouseX * 0.25;
      targetY = mouseY * 0.25 + Math.sin(time * 1.5) * 0.08;
      targetZ = 0;
      rotY = time * 0.7;
    } else if (chapter === 2) {
      // Chapter 2: Problem - hangs in middle, jittering, unable to move, red pulse
      const jitter = (Math.random() - 0.5) * 0.06;
      targetX = jitter;
      targetY = (Math.random() - 0.5) * 0.06;
      targetZ = 0;
      rotY = Math.sin(time * 5.0) * 0.2;
      rotZ = (Math.random() - 0.5) * 0.1;

      // Pulsing red
      const redPulse = 0.5 + Math.sin(time * 6.0) * 0.4;
      bodyColor = new THREE.Color("#3b0707");
      ringEmissive = new THREE.Color("#EF4444");
      ringIntensity = 1.0 + redPulse * 2.0;
    } else if (chapter === 3) {
      // Chapter 3: Solution - locks firmly in vault center
      targetX = 0;
      targetY = 0;
      targetZ = 0;
      rotX = 0.2;
      rotY = time * 0.5;
    } else if (chapter === 4) {
      // Chapter 4: Traveling with dolly through stations
      const stationT = (t - 0.38) / (0.54 - 0.38);
      targetX = THREE.MathUtils.lerp(-1.8, 1.8, stationT);
      targetY = Math.sin(time * 2.0) * 0.05;
      targetZ = 0;
      rotY = time * 1.5;
    } else if (chapter === 5) {
      // Chapter 5: Verifier gate approach
      targetX = 1.2;
      targetY = 0.3 + Math.sin(time * 1.5) * 0.04;
      targetZ = 0.5;
      rotY = time * 1.0;
    } else if (chapter === 6) {
      // Chapter 6: Outcomes based on selected scenario
      if (outcomeType === "worker_stream") {
        // Stream right toward worker
        targetX = 2.0 + Math.sin(time * 3) * 0.1;
        targetY = -0.2;
        ringEmissive = new THREE.Color("#14B8A6");
      } else if (outcomeType === "client_refund") {
        // Stream left back to client
        targetX = -2.0 + Math.sin(time * 3) * 0.1;
        targetY = -0.2;
        ringEmissive = new THREE.Color("#EF4444");
      } else if (outcomeType === "split_stream") {
        // Hover centered between both
        targetX = 0;
        targetY = Math.sin(time * 2) * 0.08;
        ringEmissive = new THREE.Color("#38BDF8");
      } else if (outcomeType === "review_bay") {
        // Halts in amber review bay
        targetX = 0;
        targetY = -0.8;
        ringEmissive = new THREE.Color("#F59E0B");
        ringIntensity = 2.5;
      }
      rotY = time * 1.2;
    } else if (chapter === 7) {
      // Chapter 7: Features - pulled back, quiet grid
      targetX = 0;
      targetY = 0;
      targetZ = -1.5;
      rotY = time * 0.3;
      ringIntensity = 0.8;
    } else {
      // Chapter 8: Final CTA - settled in vault, slow proud rotation
      targetX = 0;
      targetY = 0;
      targetZ = 0;
      rotY = time * 0.5;
      ringEmissive = new THREE.Color("#14B8A6");
      ringIntensity = 2.5;
    }

    // Smooth lerp position & rotation
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.08);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.08);
    meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.08);

    meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, rotX, 0.08);
    meshRef.current.rotation.y = rotY;
    meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, rotZ, 0.08);

    // Apply materials
    if (bodyMatRef.current) {
      bodyMatRef.current.color.lerp(bodyColor, 0.08);
    }
    if (ringMatRef.current) {
      ringMatRef.current.emissive.lerp(ringEmissive, 0.08);
      ringMatRef.current.emissiveIntensity = ringIntensity;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Coin Central Disc / Cylinder */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.14, 48]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#0f172a"
          metalness={0.88}
          roughness={0.22}
        />
      </mesh>

      {/* Beveled Edge / Outer Trim */}
      <mesh>
        <torusGeometry args={[0.9, 0.04, 16, 48]} />
        <meshStandardMaterial
          color="#334155"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      {/* Thin Emissive Glow Ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.82, 0.025, 16, 48]} />
        <meshStandardMaterial
          ref={ringMatRef}
          color="#14B8A6"
          emissive="#14B8A6"
          emissiveIntensity={2.0}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>

      {/* Subtle Central Emblem Ring */}
      <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.45, 32]} />
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, -0.075, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.45, 32]} />
        <meshBasicMaterial color="#14B8A6" transparent opacity={0.35} />
      </mesh>
    </group>
  );
};
