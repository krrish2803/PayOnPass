import { OutcomeType } from "../content/scenarios";

export interface ScrollStoreState {
  globalProgress: number;     // 0 to 1
  activeChapter: number;      // 1 to 8
  sectionProgress: Record<string, number>;
  selectedScenario: string;
  outcomeType: OutcomeType;
  mouseX: number;
  mouseY: number;
}

/**
 * High-performance module-level mutable store.
 * Updates at 60/120fps from ScrollTrigger & pointer events WITHOUT triggering React re-renders.
 * The 3D scene reads directly from this store in useFrame.
 */
export const scrollStore: ScrollStoreState = {
  globalProgress: 0,
  activeChapter: 1,
  sectionProgress: {
    hero: 0,
    problem: 0,
    solution: 0,
    solves: 0,
    how: 0,
    features: 0,
    who: 0,
    cta: 0,
  },
  selectedScenario: "clean-pass",
  outcomeType: "worker_stream",
  mouseX: 0,
  mouseY: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeToScenarioChange(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setScenarioOutcome(scenarioId: string, outcome: OutcomeType) {
  scrollStore.selectedScenario = scenarioId;
  scrollStore.outcomeType = outcome;
  listeners.forEach((fn) => fn());
}
