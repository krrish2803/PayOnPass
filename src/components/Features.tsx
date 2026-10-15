import React from "react";
import { FEATURES_DATA } from "../content/features";
import { StatusBadge } from "./StatusBadge";
import { Shield, Sparkles } from "lucide-react";

export const Features: React.FC = () => {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative min-h-screen py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 pointer-events-auto"
    >
      <div className="mb-14">
        <span className="text-xs font-mono uppercase tracking-widest text-teal-400 font-semibold">
          CHAPTER 07 · CAPABILITIES & DEFENSE
        </span>
        <h2
          id="features-heading"
          className="text-3xl sm:text-5xl font-display font-bold text-primary mt-2 max-w-3xl tracking-tight"
        >
          Built so the AI can only make things safer.
        </h2>
      </div>

      <div className="space-y-16">
        {FEATURES_DATA.map((group) => {
          const isCore = group.groupTitle === "Core loop";
          return (
            <div key={group.groupTitle}>
              <div className="flex items-center gap-2 mb-6 pb-2 border-b border-panel-border/60">
                {isCore ? (
                  <Shield className="w-4 h-4 text-teal-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-purple-400" />
                )}
                <h3 className="text-lg font-display font-bold text-primary uppercase tracking-wider text-sm">
                  {group.groupTitle}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {group.items.map((feat) => (
                  <div
                    key={feat.id}
                    className="panel-glass panel-glass-hover p-5 rounded-xl flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h4 className="font-display font-bold text-primary text-base">
                          {feat.name}
                        </h4>
                        <StatusBadge status={feat.status} />
                      </div>
                      <p className="text-muted text-xs sm:text-sm font-body leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
