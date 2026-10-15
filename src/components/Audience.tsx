import React from "react";
import { AUDIENCE_COPY } from "../content/copy";
import { User, Cpu, Ban } from "lucide-react";

export const Audience: React.FC = () => {
  return (
    <section
      id="who"
      aria-labelledby="who-heading"
      className="relative min-h-screen flex flex-col justify-center py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 pointer-events-auto"
    >
      <div className="mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
          TARGET SEGMENTS
        </span>
        <h2
          id="who-heading"
          className="text-3xl sm:text-5xl font-display font-bold text-primary mt-2 max-w-2xl tracking-tight"
        >
          {AUDIENCE_COPY.h2}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {AUDIENCE_COPY.segments.map((seg, idx) => {
          if (seg.muted) {
            return (
              <div
                key={idx}
                className="p-7 rounded-xl bg-white/[0.015] border border-panel-border/40 text-muted/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-4 text-xs font-mono uppercase text-muted/60 tracking-wider">
                    <Ban className="w-4 h-4 text-muted/60" />
                    <span>{seg.tag}</span>
                  </div>
                  <h3 className="text-lg font-display font-semibold text-muted/80 mb-3">
                    {seg.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-body leading-relaxed text-muted/60">
                    {seg.desc}
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-panel-border/20 text-[11px] font-mono text-muted/50">
                  Explicitly out of scope
                </div>
              </div>
            );
          }

          const isPrimary = seg.primary;
          const Icon = isPrimary ? User : Cpu;

          return (
            <div
              key={idx}
              className={`panel-glass panel-glass-hover p-7 rounded-xl flex flex-col justify-between ${
                isPrimary ? "border-teal-500/30 shadow-glow-teal ring-1 ring-teal-500/20" : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isPrimary
                        ? "bg-teal-500/20 text-teal-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-mono uppercase tracking-wider font-semibold ${
                      isPrimary ? "text-teal-400" : "text-purple-400"
                    }`}
                  >
                    {seg.tag}
                  </span>
                </div>

                <h3 className="text-xl font-display font-bold text-primary mb-3">
                  {seg.title}
                </h3>
                <p className="text-muted text-sm sm:text-base font-body leading-relaxed">
                  {seg.desc}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-panel-border/40 text-xs font-mono text-muted/80">
                {isPrimary ? "Primary Pitch Target" : "Agentic Commerce Ready"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
