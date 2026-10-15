import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { scrollStore } from "../lib/scroll";
import { cameraCurve, targetCurve, getChapterFromProgress } from "./cameraPath";
import { Coin } from "./Coin";
import { Vault } from "./Vault";
import { Nodes } from "./Nodes";
import { ChecklistRings } from "./ChecklistRings";
import { Stations } from "./Stations";
import { Gate } from "./Gate";
import { Packets } from "./Packets";
import { Streams } from "./Streams";
import { Particles } from "./Particles";
import { isMobileDevice } from "../lib/gpuTier";

export const SceneRoot: React.FC = () => {
  const { camera } = useThree();
  const lerpedProgress = useRef(0);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const isMobile = isMobileDevice();

  const [dprFactor, setDprFactor] = useState(1);
  const [enableBloom, setEnableBloom] = useState(!isMobile);

  // Performance degradation callback
  const handlePerformanceDegrade = () => {
    setEnableBloom(false);
    setDprFactor(0.85);
  };

  useFrame((_, delta) => {
    // Read from non-react mutable store
    const targetP = scrollStore.globalProgress;

    // Damped lerp (damping ~ 0.08)
    const damping = Math.min(delta * 5.0, 0.12);
    lerpedProgress.current = THREE.MathUtils.lerp(lerpedProgress.current, targetP, damping);
    const t = Math.max(0, Math.min(lerpedProgress.current, 0.9999));

    // Update active chapter in store
    scrollStore.activeChapter = getChapterFromProgress(t);

    // Camera spline dolly
    const camPos = cameraCurve.getPointAt(t);
    const targetPos = targetCurve.getPointAt(t);

    camera.position.copy(camPos);

    // Smooth look-at target lerp
    currentLookAt.current.lerp(targetPos, 0.1);
    camera.lookAt(currentLookAt.current);
  });

  return (
    <>
      <PerformanceMonitor onDecline={handlePerformanceDegrade} />

      {/* Atmospheric Studio Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[6, 8, 5]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-4, -2, -2]} intensity={0.4} color="#38bdf8" />
      <pointLight position={[3, 2, -2]} intensity={0.6} color="#14B8A6" />

      {/* Background Soft Particles */}
      <Particles />

      {/* 3D Scene Actors */}
      <Vault />
      <Coin lerpedProgress={lerpedProgress} />
      <Nodes />
      <ChecklistRings />
      <Stations />
      <Gate />
      <Packets />
      <Streams />

      {/* Floor Reference Grid in Chapter 7 (Features) */}
      <gridHelper
        args={[24, 24, "#14B8A6", "#1e293b"]}
        position={[0, -1.8, 0]}
      />

      {/* High-tier Bloom Pass */}
      {enableBloom && (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            luminanceThreshold={0.7}
            luminanceSmoothing={0.3}
            intensity={0.6}
            mipmapBlur
          />
        </EffectComposer>
      )}
    </>
  );
};
