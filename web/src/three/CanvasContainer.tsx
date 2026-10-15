import React, { useState, useEffect, Suspense, lazy } from "react";
import { Canvas } from "@react-three/fiber";
import { isWebGLAvailable, prefersReducedMotion, getEffectiveDpr } from "../lib/gpuTier";
import { scrollStore } from "../lib/scroll";

const SceneRoot = lazy(() =>
  import("./SceneRoot").then((module) => ({ default: module.SceneRoot }))
);

export const CanvasContainer: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(true);

  const hasWebGL = isWebGLAvailable();
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    // Lazy-load Canvas after first paint
    const timer = setTimeout(() => {
      setMounted(true);
    }, 150);

    // Pause rendering when tab is hidden
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    // Mouse parallax tracking
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return;
      scrollStore.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      scrollStore.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Reduced motion or No WebGL fallback: Atmospheric static poster
  if (reducedMotion || !hasWebGL) {
    return (
      <div
        className="fixed inset-0 z-0 pointer-events-none aria-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-radial-vignette opacity-80" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-teal-500/10 blur-[120px]" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    >
      {/* CSS Gradient Backdrop & Poster while Canvas mounts */}
      <div className="absolute inset-0 bg-[#0B1020]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-teal-500/[0.07] blur-[140px]" />

      {mounted && isTabVisible && (
        <Canvas
          dpr={getEffectiveDpr()}
          camera={{ position: [0, 0, 5.5], fov: 45 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          className="w-full h-full"
        >
          <Suspense fallback={null}>
            <SceneRoot />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
};
