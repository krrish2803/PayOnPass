import React from "react";
import { PROBLEM_COPY } from "../content/copy";
import { AlertCircle, UserX, Clock, Bot } from "lucide-react";

const CARD_ICONS = [UserX, AlertCircle, Clock, Bot];

export const Problem: React.FC = () => {
  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className="relative min-h-screen flex flex-col justify-center py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 pointer-events-auto"
    >
      <div className="mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-fail font-semibold">
          CHAPTER 02 · THE STANDOFF
        </span>
        <h2
          id="problem-heading"
          className="text-3xl sm:text-5xl font-display font-bold text-primary mt-2 max-w-2xl tracking-tight"
        >
          {PROBLEM_COPY.h2}
        </h2>
      </div>

      {/* Four Problem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {PROBLEM_COPY.cards.map((card, idx) => {
          const Icon = CARD_ICONS[idx % CARD_ICONS.length];
          return (
            <div
              key={idx}
              className="panel-glass panel-glass-hover p-7 rounded-xl flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-fail/10 border border-fail/20 flex items-center justify-center text-fail mb-5">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2 font-display">
                  {card.title}
                </h3>
                <p className="text-muted text-sm sm:text-base leading-relaxed font-body">
                  {card.desc}
                </p>
              </div>

              {card.footnote && (
                <p className="mt-4 pt-3 border-t border-panel-border/40 text-xs text-muted/70 font-mono">
                  {card.footnote}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Large closing punchline */}
      <div className="panel-glass border-l-4 border-l-fail p-6 sm:p-8 rounded-r-xl max-w-4xl">
        <p className="text-xl sm:text-2xl md:text-3xl font-display font-semibold text-primary leading-snug">
          "{PROBLEM_COPY.closing}"
        </p>
      </div>
    </section>
  );
};
