import * as THREE from "three";

/**
 * 3D Spline Curves for Camera Dolly and Look-At Target across 8 Chapters.
 * Evaluated with getPointAt(clampedProgress).
 */

const cameraPoints = [
  new THREE.Vector3(0, 0.2, 5.2),       // Chapter 1: Hero
  new THREE.Vector3(0, 1.0, 6.5),       // Chapter 2: Problem
  new THREE.Vector3(1.2, 1.6, 5.2),     // Chapter 3: Solution Checklist
  new THREE.Vector3(-2.0, 1.5, 5.5),    // Chapter 4: How It Works (Start)
  new THREE.Vector3(0.5, 1.0, 4.8),     // Chapter 4: How It Works (Mid)
  new THREE.Vector3(1.8, 0.4, 3.4),     // Chapter 5: Verifier Gate Close-up
  new THREE.Vector3(0, 1.8, 6.2),       // Chapter 6: Outcomes & Streams
  new THREE.Vector3(0, 4.5, 11.0),      // Chapter 7: Features Wide Pullback
  new THREE.Vector3(0, 0.8, 6.2),       // Chapter 8: Final CTA
];

const targetPoints = [
  new THREE.Vector3(0, 0, 0),           // Chapter 1: Hero Coin
  new THREE.Vector3(0, 0, 0),           // Chapter 2: Problem Center
  new THREE.Vector3(0, 0.1, 0),         // Chapter 3: Solution Vault
  new THREE.Vector3(-1.0, 0.2, 0),      // Chapter 4: Station 1-2
  new THREE.Vector3(0.5, 0.2, 0),       // Chapter 4: Station 3-4
  new THREE.Vector3(1.5, 0.3, 0),       // Chapter 5: Gate Focal Point
  new THREE.Vector3(0, 0, 0),           // Chapter 6: Stream Center
  new THREE.Vector3(0, 0, 0),           // Chapter 7: Quiet Grid
  new THREE.Vector3(0, 0, 0),           // Chapter 8: Final Vault
];

export const cameraCurve = new THREE.CatmullRomCurve3(cameraPoints, false, "centripetal", 0.5);
export const targetCurve = new THREE.CatmullRomCurve3(targetPoints, false, "centripetal", 0.5);

export function getChapterFromProgress(progress: number): number {
  if (progress < 0.12) return 1;
  if (progress < 0.26) return 2;
  if (progress < 0.38) return 3;
  if (progress < 0.54) return 4;
  if (progress < 0.70) return 5;
  if (progress < 0.82) return 6;
  if (progress < 0.92) return 7;
  return 8;
}
