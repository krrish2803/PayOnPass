import React from "react";
import { SOLUTION_COPY } from "../content/copy";
import { FileCheck, ShieldCheck, Scale } from "lucide-react";

const PILLAR_ICONS = [FileCheck, ShieldCheck, Scale];

export const Solution: React.FC = () => {
  return (
    <section
      id="solution"
      aria-labelledby="solution-heading"
      className="relative min-h-screen flex flex-col justify-center py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 pointer-events-auto"
    >
      <div className="mb-14 max-w-3xl">
        <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
          CHAPTER 03 · THE CHECKLIST
        </span>
        <h2
          id="solution-heading"
          className="text-3xl sm:text-5xl font-display font-bold text-primary mt-2 tracking-tight"
        >
          {SOLUTION_COPY.h2}
        </h2>
        <p className="text-muted text-base sm:text-lg mt-4 font-body leading-relaxed">
          {SOLUTION_COPY.sub}
        </p>
      </div>

      {/* Three Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SOLUTION_COPY.pillars.map((pillar, idx) => {
          const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];
          return (
            <div
              key={idx}
              className="panel-glass panel-glass-hover p-8 rounded-xl flex flex-col justify-between relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono font-bold text-muted/60 tracking-wider">
                    {pillar.step}
                  </span>
                </div>

                <h3 className="text-xl font-display font-bold text-primary mb-3">
                  {pillar.title}
                </h3>
                <p className="text-muted text-sm sm:text-base leading-relaxed font-body">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-panel-border/50 flex items-center gap-2 text-xs font-mono text-teal-400/80">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Deterministic Gate</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
