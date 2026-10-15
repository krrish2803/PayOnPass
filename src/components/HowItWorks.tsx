import React from "react";
import { HOW_IT_WORKS_STEPS, DECISION_RULES } from "../content/copy";
import { ReceiptCard } from "./ReceiptCard";
import { ScenarioSwitcher } from "./ScenarioSwitcher";
import { Layers, ShieldCheck } from "lucide-react";

export const HowItWorks: React.FC = () => {
  return (
    <section
      id="how"
      aria-labelledby="how-heading"
      className="relative min-h-screen py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 pointer-events-auto"
    >
      <div className="mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
          CHAPTER 04 & 05 · EXECUTION PIPELINE
        </span>
        <h2
          id="how-heading"
          className="text-3xl sm:text-5xl font-display font-bold text-primary mt-2 max-w-2xl tracking-tight"
        >
          Five steps from request to payout.
        </h2>
      </div>

      {/* 5 Scrubbed / Synced Steps */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-16">
        {HOW_IT_WORKS_STEPS.map((step) => (
          <div
            key={step.num}
            className="panel-glass panel-glass-hover p-6 rounded-xl flex flex-col justify-between border-t-2 border-t-teal-500/40 relative"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-display font-bold text-teal-400">
                  0{step.num}
                </span>
                <span className="text-xs font-mono uppercase text-muted tracking-wider">
                  Station
                </span>
              </div>
              <h3 className="text-lg font-display font-bold text-primary mb-2">
                {step.name}
              </h3>
              <p className="text-muted text-xs sm:text-sm font-body leading-relaxed">
                {step.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-panel-border/40 text-[11px] font-mono text-muted/60">
              Station #{step.num} Landmark
            </div>
          </div>
        ))}
      </div>

      {/* Decision Rule Strip */}
      <div className="panel-glass p-6 rounded-xl border border-panel-border/80 mb-16">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
            Deterministic Decision Thresholds
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DECISION_RULES.map((dr, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg bg-white/[0.02] border border-panel-border/60 flex flex-col justify-between"
            >
              <span className="text-xs text-muted font-body mb-2">{dr.rule}</span>
              <span
                className={`text-sm font-mono font-bold ${
                  dr.color === "teal"
                    ? "text-teal-400"
                    : dr.color === "review"
                    ? "text-amber-400"
                    : dr.color === "fail"
                    ? "text-fail"
                    : "text-primary"
                }`}
              >
                Outcome: {dr.outcome}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Area: Receipt Card & System Description */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <h3 className="text-xl font-display font-bold text-primary">
              Immutable Cryptographic Audit
            </h3>
          </div>
          <p className="text-muted text-sm sm:text-base font-body leading-relaxed">
            Every evaluation produces a canonical JSON receipt sealed with SHA-256 before any money moves at PayPal. 
            The hash is chained with the previous receipt in the ledger, preventing stealth database modifications.
          </p>
          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 font-mono">
            Invariant: Nothing moves at PayPal until the decision is committed and sealed in SQLite.
          </div>
        </div>

        <div className="lg:col-span-7">
          <ReceiptCard />
        </div>
      </div>

      {/* Section 5b: Scenario Switcher */}
      <ScenarioSwitcher />
    </section>
  );
};
