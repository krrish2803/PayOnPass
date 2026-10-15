import React from "react";
import { SOLVES_MAPPING } from "../content/copy";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export const Solves: React.FC = () => {
  return (
    <section
      id="solves"
      aria-labelledby="solves-heading"
      className="relative min-h-screen flex flex-col justify-center py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 pointer-events-auto"
    >
      <div className="mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
          SYSTEM ARCHITECTURE · INVARIANTS
        </span>
        <h2
          id="solves-heading"
          className="text-3xl sm:text-5xl font-display font-bold text-primary mt-2 max-w-2xl tracking-tight"
        >
          {SOLVES_MAPPING.h2}
        </h2>
      </div>

      {/* Two-Column Problem-Solution Mapping Matrix */}
      <div className="space-y-4 max-w-5xl">
        {SOLVES_MAPPING.rows.map((row, idx) => (
          <div
            key={idx}
            className="panel-glass panel-glass-hover p-6 sm:p-7 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 border-l-4 border-l-teal-500"
          >
            {/* Left: Pain */}
            <div className="flex items-center gap-3 md:w-2/5 shrink-0">
              <div className="w-7 h-7 rounded-full bg-fail/15 text-fail flex items-center justify-center shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <span className="font-display font-semibold text-base sm:text-lg text-primary">
                {row.pain}
              </span>
            </div>

            {/* Middle Divider Arrow */}
            <div className="hidden md:flex items-center text-muted/40 shrink-0">
              <ArrowRight className="w-5 h-5 text-teal-400/60" />
            </div>

            {/* Right: Answer */}
            <div className="flex items-start gap-3 md:w-3/5">
              <div className="w-7 h-7 rounded-full bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-sm sm:text-base text-muted font-body leading-relaxed">
                {row.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
