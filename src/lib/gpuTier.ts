export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getEffectiveDpr(): number {
  if (typeof window === "undefined") return 1;
  if (isMobileDevice()) return 1;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(Math.max(dpr, 1), 1.75);
}
