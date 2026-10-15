import React, { useState, useEffect, useRef } from "react";
import { DEMO_SCENARIOS, SCENARIO_FOOTNOTE, DemoScenario } from "../content/scenarios";
import { setScenarioOutcome } from "../lib/scroll";
import { Check, ShieldAlert, Sliders } from "lucide-react";

export const ScenarioSwitcher: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>("clean-pass");
  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === selectedId) || DEMO_SCENARIOS[0];

  // Number ticker animation
  const [displayedWorker, setDisplayedWorker] = useState(activeScenario.workerPayout);
  const [displayedRefund, setDisplayedRefund] = useState(activeScenario.clientRefund);
  const [displayedFee, setDisplayedFee] = useState(activeScenario.platformFee);

  const prevWorker = useRef(activeScenario.workerPayout);
  const prevRefund = useRef(activeScenario.clientRefund);
  const prevFee = useRef(activeScenario.platformFee);

  useEffect(() => {
    // Notify 3D store
    setScenarioOutcome(activeScenario.id, activeScenario.outcomeType);

    // Smooth counter interpolation
    const startTime = performance.now();
    const duration = 400; // ms
    const startW = prevWorker.current;
    const startR = prevRefund.current;
    const startF = prevFee.current;
    const targetW = activeScenario.workerPayout;
    const targetR = activeScenario.clientRefund;
    const targetF = activeScenario.platformFee;

    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quad
      const ease = 1 - (1 - progress) * (1 - progress);

      setDisplayedWorker(Number((startW + (targetW - startW) * ease).toFixed(2)));
      setDisplayedRefund(Number((startR + (targetR - startR) * ease).toFixed(2)));
      setDisplayedFee(Number((startF + (targetF - startF) * ease).toFixed(2)));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevWorker.current = targetW;
        prevRefund.current = targetR;
        prevFee.current = targetF;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activeScenario]);

  // Arrow key navigation for radiogroup accessibility
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (index + 1) % DEMO_SCENARIOS.length;
      setSelectedId(DEMO_SCENARIOS[nextIndex].id);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (index - 1 + DEMO_SCENARIOS.length) % DEMO_SCENARIOS.length;
      setSelectedId(DEMO_SCENARIOS[prevIndex].id);
    }
  };

  return (
    <div className="panel-glass rounded-2xl p-6 sm:p-8 border border-panel-border shadow-2xl mt-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-panel-border/60 pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
            INTERACTIVE OUTCOMES ENGINE
          </span>
          <h3 className="text-xl sm:text-2xl font-display font-bold text-primary mt-1">
            Simulate 5 Seeded Scenarios
          </h3>
          <p className="text-muted text-xs sm:text-sm mt-1">
            Standard demo job: "5 product descriptions, 90 to 110 words each" · Captured amount: $20.00
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted/70 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-panel-border self-start sm:self-auto">
          <Sliders className="w-3.5 h-3.5 text-teal-400" />
          <span>Interactive Model</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Accessible Radio Group */}
        <div
          role="radiogroup"
          aria-label="Demo job outcomes switcher"
          className="lg:col-span-6 space-y-2.5"
        >
          {DEMO_SCENARIOS.map((scenario, idx) => {
            const isSelected = scenario.id === selectedId;
            return (
              <div
                key={scenario.id}
                role="radio"
                tabIndex={isSelected ? 0 : -1}
                aria-checked={isSelected}
                onClick={() => setSelectedId(scenario.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                  isSelected
                    ? "bg-teal-500/10 border-teal-500/40 shadow-glow-teal ring-1 ring-teal-500/30"
                    : "bg-white/[0.02] border-panel-border/60 hover:bg-white/[0.05] hover:border-panel-border"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isSelected
                      ? "border-teal-400 bg-teal-400 text-ink"
                      : "border-muted/40 bg-transparent"
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-display font-semibold text-sm sm:text-base ${
                        isSelected ? "text-teal-300" : "text-primary"
                      }`}
                    >
                      {scenario.name}
                    </span>
                    {scenario.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                        Review
                      </span>
                    )}
                  </div>
                  <p className="text-muted text-xs sm:text-sm mt-1 font-body leading-relaxed">
                    {scenario.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Live Ledger & Animated Monospace Numbers */}
        <div className="lg:col-span-6 bg-ink/70 rounded-xl p-6 border border-panel-border/80 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-panel-border/60 mb-5">
              <span className="text-xs font-mono uppercase text-muted tracking-wider">
                Settlement Output Ledger
              </span>
              <span className="text-xs font-mono text-teal-400/80">LIVE SYNC</span>
            </div>

            {/* Status Alert if Review Held */}
            {activeScenario.badge && (
              <div className="mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-amber-400 text-xs font-mono">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{activeScenario.badge.label}</span>
              </div>
            )}

            {/* Monospace Accounting Matrix */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between p-3 rounded-lg bg-white/[0.02]">
                <span className="text-sm font-body text-muted">Worker Payout</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-teal-400 tabular-nums">
                  ${displayedWorker.toFixed(2)}
                </span>
              </div>

              <div className="flex items-baseline justify-between p-3 rounded-lg bg-white/[0.02]">
                <span className="text-sm font-body text-muted">Client Refund</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-primary tabular-nums">
                  ${displayedRefund.toFixed(2)}
                </span>
              </div>

              <div className="flex items-baseline justify-between p-3 rounded-lg bg-white/[0.02]">
                <span className="text-sm font-body text-muted">Platform Fee (10%)</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-muted tabular-nums">
                  ${displayedFee.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Reconciliation Total Check */}
            <div className="mt-6 pt-4 border-t border-panel-border/60 flex items-center justify-between text-xs font-mono text-muted">
              <span>Total Captured:</span>
              <span className="text-primary font-bold text-sm">$20.00</span>
            </div>
          </div>

          {/* Accessible Live Region */}
          <div className="sr-only" aria-live="polite">
            {`Selected scenario: ${activeScenario.name}. Worker receives $${activeScenario.workerPayout.toFixed(2)}, Client refunded $${activeScenario.clientRefund.toFixed(2)}, Platform fee $${activeScenario.platformFee.toFixed(2)}.`}
          </div>

          {/* Mandatory Footnote */}
          <p className="mt-6 pt-4 border-t border-panel-border/40 text-xs font-mono text-muted/70 leading-relaxed">
            {SCENARIO_FOOTNOTE}
          </p>
        </div>
      </div>
    </div>
  );
};
